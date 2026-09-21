"""Close inspection of the authored tree kit, with the same exported GLB as the game."""
import bpy, os
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(root,'public/maps/genting/blender/tropical-trees.glb'))
for o in bpy.context.scene.objects:
    if o.name.startswith('TropicalTree_'): o.location.x=(int(o.name.split('_')[1])-3.5)*9
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_x=1500; scene.render.resolution_y=780; scene.render.resolution_percentage=100
scene.world.color=(.45,.45,.45)
bpy.ops.object.light_add(type='SUN'); bpy.context.object.rotation_euler=(.4,-.4,-.5); bpy.context.object.data.energy=2
bpy.ops.object.camera_add(location=(28,-65,22)); camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,7))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=80
scene.camera=camera; scene.render.filepath=os.path.join(root,'tmp/genting-blender/tree-kit-preview.png')
bpy.ops.render.render(write_still=True)
