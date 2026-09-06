import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Vector3 } from "three";

type Contact = { point: Vector3; normal: Vector3; right: Vector3 };
const WIDTH = 0.1025;
const OFFSET = 0.008;

/** Independent world-space quads: ring-buffer reuse never reconnects old trails. */
export class SkidTrail {
  readonly geometry = new BufferGeometry();
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  private head = 0;
  private count = 0;
  private dirty = false;
  private capacity: number;
  private tracks = Array.from({ length: 4 }, () => ({
    active: false, point: new Vector3(), left: new Vector3(), right: new Vector3(), normal: new Vector3(), alpha: 0,
  }));
  private side = new Vector3();
  private left = new Vector3();
  private right = new Vector3();

  constructor(capacity = 4096) {
    this.capacity = capacity;
    this.positions = new Float32Array(capacity * 12);
    this.colors = new Float32Array(capacity * 16);
    const indices = new Uint32Array(capacity * 6);
    for (let i = 0; i < capacity; i++) {
      const v = i * 4;
      indices.set([v, v + 1, v + 2, v + 2, v + 1, v + 3], i * 6);
    }
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute("color", new BufferAttribute(this.colors, 4).setUsage(DynamicDrawUsage));
    this.geometry.setIndex(new BufferAttribute(indices, 1));
    this.geometry.setDrawRange(0, 0);
  }

  sample(index: number, contact: Contact, intensity: number) {
    const track = this.tracks[index];
    if (intensity <= 0) { track.active = false; return; }
    this.side.copy(contact.right).addScaledVector(contact.normal, -contact.right.dot(contact.normal)).normalize();
    if (this.side.lengthSq() < 0.5) { track.active = false; return; }
    this.left.copy(contact.point).addScaledVector(this.side, -WIDTH).addScaledVector(contact.normal, OFFSET);
    this.right.copy(contact.point).addScaledVector(this.side, WIDTH).addScaledVector(contact.normal, OFFSET);
    const distance = track.point.distanceTo(contact.point);
    const continuous = track.active && distance < 1.5 && track.normal.dot(contact.normal) > 0.9;
    if (continuous && distance < 0.08) return;
    const alpha = Math.min(0.75, Math.max(0.2, intensity * 0.65));
    if (continuous) {
      const points = [track.left, track.right, this.left, this.right];
      for (let v = 0; v < 4; v++) {
        points[v].toArray(this.positions, this.head * 12 + v * 3);
        this.colors.set([0.018, 0.02, 0.023, v < 2 ? track.alpha : alpha], this.head * 16 + v * 4);
      }
      this.head = (this.head + 1) % this.capacity;
      this.count = Math.min(this.capacity, this.count + 1);
      this.dirty = true;
    }
    track.active = true;
    track.point.copy(contact.point);
    track.normal.copy(contact.normal);
    track.left.copy(this.left);
    track.right.copy(this.right);
    track.alpha = alpha;
  }

  commit() {
    if (!this.dirty) return;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.setDrawRange(0, this.count * 6);
    this.dirty = false;
  }
}
