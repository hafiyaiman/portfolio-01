"""Blender 5.1: author and export the playable Genting environment and tree kit.
Run after export-genting-blender.mjs. Uses supplied map geometry and CC0 bark.
"""
import bpy, bmesh, json, math, random, os, runpy
from mathutils import Vector
random.seed(9281)
bpy.context.preferences.filepaths.save_version=0
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public/maps/genting/blender')
data = json.load(open(os.path.join(ROOT, 'tmp/genting-blender/course.json')))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, rgb, rough=0.8, metal=0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*rgb, 1); m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
    return m
mats = {n: material(n, c, r, m) for n,c,r,m in [
    ('Forest floor',(0.10,0.18,0.075),1,0), ('Asphalt',(0.105,0.12,0.125),0.68,0),
    ('Concrete',(0.36,0.39,0.35),0.92,0), ('Galvanized steel',(0.53,0.59,0.61),0.4,0.65),
    ('White paint',(0.85,0.87,0.79),0.72,0), ('Hazard yellow',(0.95,0.64,0.025),0.6,0),
    ('Black',(0.022,0.029,0.026),0.8,0), ('Sign green',(0.018,0.16,0.09),0.6,0),
    ('Bark',(0.16,0.105,0.063),1,0), ('Leaf dark',(0.025,0.095,0.045),1,0),
    ('Leaf mid',(0.055,0.18,0.075),1,0), ('Leaf light',(0.13,0.28,0.105),1,0),
    ('Temple red',(0.40,0.055,0.035),0.8,0), ('Roof tile',(0.27,0.12,0.055),0.8,0),
    ('Gold',(0.78,0.49,0.12),0.4,0.35), ('Glass',(0.045,0.11,0.14),0.24,0.3),
    ('Hotel cream',(0.66,0.65,0.51),0.8,0), ('Hotel coral',(0.58,0.16,0.12),0.8,0),
    ('Hotel ochre',(0.73,0.40,0.10),0.8,0), ('Hotel mint',(0.15,0.41,0.32),0.8,0) ]}

# Packed original aggregate texture survives glTF export (no unsupported noise nodes).
asphalt=bpy.data.images.new('Fine weathered asphalt',width=256,height=256)
pixels=[]
for i in range(256*256):
    n=random.uniform(0.27,0.36)
    if random.random()<0.035: n+=0.12
    pixels.extend((n*0.94,n,n*1.02,1))
asphalt.pixels.foreach_set(pixels); asphalt.pack()
tex=mats['Asphalt'].node_tree.nodes.new('ShaderNodeTexImage'); tex.image=asphalt
mats['Asphalt'].node_tree.links.new(tex.outputs['Color'],mats['Asphalt'].node_tree.nodes.get('Principled BSDF').inputs['Base Color'])

def coord(p): return (p[0], -p[2], p[1])
def mesh(name, verts, faces, mat):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); me.materials.append(mats[mat]); return ob
def box(name, p, scale, mat, bevel=0):
    sx,sy,sz=[s/2 for s in scale]
    o=mesh(name,[(-sx,-sy,-sz),(-sx,-sy,sz),(-sx,sy,-sz),(-sx,sy,sz),(sx,-sy,-sz),(sx,-sy,sz),(sx,sy,-sz),(sx,sy,sz)],[(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat)
    o.location=p
    if bevel:
        bm=bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.bevel(bm,geom=list(bm.edges),offset=bevel,segments=2,affect='EDGES')
        bm.to_mesh(o.data); bm.free()
    return o
def rod(name, a, b, radius, mat, vertices=8):
    delta=Vector(b)-Vector(a)
    verts=[(radius*math.cos(i*math.tau/vertices),radius*math.sin(i*math.tau/vertices),z) for z in [0,delta.length] for i in range(vertices)]
    faces=[(i,(i+1)%vertices,(i+1)%vertices+vertices,i+vertices) for i in range(vertices)]
    faces.extend([tuple(reversed(range(vertices))),tuple(range(vertices,vertices*2))])
    o=mesh(name,verts,faces,mat); o.location=a; o.rotation_euler=delta.to_track_quat('Z','Y').to_euler(); return o
def text(body, p, size, mat):
    cu=bpy.data.curves.new(body,'FONT'); cu.body=body; cu.size=size; cu.align_x='CENTER'; cu.extrude=0.004
    o=bpy.data.objects.new(body,cu); bpy.context.collection.objects.link(o); o.location=p; o.rotation_euler=(math.pi/2,0,0); cu.materials.append(mats[mat])
    bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.select_set(False); return o
def localize(objects, anchor):
    # Local -Y face points against forward travel, matching the game's +Z forward.
    yaw=anchor['yaw']; origin=Vector(coord(anchor['p']))
    from mathutils import Matrix
    rot=Matrix.Rotation(yaw,4,'Z')
    for o in objects: o.matrix_world=rot @ o.matrix_world; o.location+=origin
def capture(): return set(bpy.context.scene.objects)
def added(before): return set(bpy.context.scene.objects)-before

for item in data['meshes']:
    if item['name']=='Terrain': continue
    p=item['positions']; idx=item['indices']
    ob=mesh(item['name'],[coord(p[i:i+3]) for i in range(0,len(p),3)],[idx[i:i+3] for i in range(0,len(idx),3)],item['material'])
    # Shared smooth normals avoid glTF duplicating every pavement triangle corner.
    ob.data.polygons.foreach_set('use_smooth',[True]*len(ob.data.polygons))
    if item['name']=='Pavement':
        uv=ob.data.uv_layers.new(name='Aggregate UV')
        coords=[(v.co.x/5,v.co.y/5) for v in ob.data.vertices]
        uv.data.foreach_set('uv',[n for loop in ob.data.loops for n in coords[loop.vertex_index]])
    if item['name'].startswith('Collision'): ob.hide_render=True; ob.hide_set(True)
    if item.get('colors'):
        col=ob.data.color_attributes.new(name='TerrainTint', type='FLOAT_COLOR', domain='POINT')
        rgb=item['colors']; col.data.foreach_set('color',[v for i in range(0,len(rgb),3) for v in (*rgb[i:i+3],1)])
        terrain_mat=material('Terrain vertex shades',(1,1,1),1)
        node=terrain_mat.node_tree.nodes.new('ShaderNodeVertexColor'); node.layer_name='TerrainTint'
        terrain_mat.node_tree.links.new(node.outputs['Color'],terrain_mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        ob.data.materials.clear(); ob.data.materials.append(terrain_mat)
print('Course surfaces created', flush=True)

# Continuous reinforced cut-slope panels, with ribs and drainage weep holes.
for a,b in zip(data['retaining'],data['retaining'][1:]):
    p=Vector(coord(a['p'])); q=Vector(coord(b['p'])); up=Vector((0,0,4.4))
    mesh('Retaining panel',[p,q,q+up,p+up],[(0,1,2,3)],'Concrete')
    rod('Retaining buttress',p,p+up,0.15,'Concrete',6)
    mid=(p+q)/2+Vector((0,0,0.55))
    box('Drainage weep hole',mid,(0.18,0.18,0.12),'Black')

# Detailed manufactured infrastructure, merged by material before export.
for p in data['posts']:
    x,y,z=coord(p); box('Steel I post',(x,y,z+0.4),(0.12,0.10,0.8),'Galvanized steel')
for a in data['lamps']:
    before=capture()
    rod('Tapered lamp mast',(0,0,0),(0,0,8),0.09,'Galvanized steel')
    rod('Outreach',(0,0,8),(-2,0,8.6),0.065,'Galvanized steel')
    box('LED housing',(-2,0,8.6),(0.85,0.3,0.12),'Black',0.04)
    box('LED lens',(-2,0,8.52),(0.68,0.23,0.04),'White paint')
    localize(added(before),a)
for a in data['signs']:
    before=capture()
    for x in [-2.5,2.5]: rod('Sign post',(x,0,0),(x,0,4.9),0.075,'Galvanized steel')
    box('Sign border',(0,0,4.05),(6.7,0.13,1.8),'White paint',0.09)
    box('Sign face',(0,-0.08,4.05),(6.55,0.04,1.65),'Sign green',0.06)
    text(a['title'],(0,-0.12,4.25),0.43,'White paint')
    text(a['subtitle'],(0,-0.12,3.68),0.25,'White paint')
    localize(added(before),{**a,'yaw':a['yaw']+math.pi})
for a in data['chevrons']:
    before=capture(); rod('Chevron post',(0,0,0),(0,0,2.2),0.045,'Galvanized steel')
    box('Chevron board',(0,0,1.8),(1.05,0.08,0.85),'Hazard yellow',0.03)
    mesh('Black arrow',[(-0.3,-0.045,1.45),(-0.05,-0.045,1.45),(0.32,-0.045,1.8),(-0.05,-0.045,2.15),(-0.3,-0.045,2.15),(0.07,-0.045,1.8)],[(0,1,5),(1,2,5),(2,3,5),(3,4,5)],'Black')
    localize(added(before),a)
print('Roadside infrastructure created', flush=True)

helpers=runpy.run_path(os.path.join(ROOT,'scripts/genting-mapped-assets.py'))
mapped_names=helpers['mapped_scenery'](ROOT,OUT,mats,material,data['trees'],data,mesh,box,rod,text)

# Consolidate decoration by material to avoid thousands of draw calls.
protected={item['name'] for item in data['meshes']} | mapped_names
for mat in mats.values():
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name not in protected and len(o.data.materials)==1 and o.data.materials[0]==mat]
    if not obs: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]; bpy.ops.object.join(); obs[0].name='Detail_'+mat.name

# Export visible course; hidden wall meshes are also exported for exact colliders.
for o in bpy.context.scene.objects: o.hide_set(False)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'genting-highlands.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT,'course.glb'),export_format='GLB',export_extras=True)
course_objects=list(bpy.context.scene.objects)
for o in course_objects: bpy.data.objects.remove(o,do_unlink=True)

helpers['tree_kit'](OUT,mats,material,mesh)
print('Genting Blender assets complete',flush=True)
