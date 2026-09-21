"""Render the exported assets, including instanced trees, for visual QA."""
import bpy, json, os, math, sys
from mathutils import Vector
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'public/maps/genting/blender')
data=json.load(open(os.path.join(ROOT,'tmp/genting-blender/course.json')))
bpy.ops.wm.open_mainfile(filepath=os.path.join(OUT,'genting-highlands.blend'))
for o in bpy.context.scene.objects:
    if o.name.startswith('Collision'): o.hide_render=True
before=set(bpy.context.scene.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(OUT,'tropical-trees.glb'))
templates=list(set(bpy.context.scene.objects)-before)
def coord(p): return Vector((p[0],-p[2],p[1]))
spawn=coord(data['spawn']['p'])
buildings=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith('building_')]
largest=max(buildings,key=lambda o:o.dimensions.x*o.dimensions.y*o.dimensions.z)
district=sum((largest.matrix_world@Vector(c) for c in largest.bound_box),Vector())/8
boundary_check='--boundary' in sys.argv
if boundary_check: spawn=coord((932.652,433.058,1249.462))
for x,y,z,scale,yaw,variant in json.load(open(os.path.join(OUT,'forest.json'))):
    position=Vector((x,-z,y))
    if min((position-spawn).length,(position-district).length)>650: continue
    for template in templates:
        if template.type!='MESH': continue
        parent=template
        while parent and not parent.name.startswith('TropicalTree_'): parent=parent.parent
        if not parent or parent.name!='TropicalTree_'+str(variant): continue
        o=bpy.data.objects.new('Forest instance',template.data); bpy.context.collection.objects.link(o)
        # glTF imports tree objects with a 90-degree X conversion at the root.
        o.matrix_world=template.matrix_world.copy(); o.location=coord((x,y,z)); o.scale*=scale
        o.rotation_euler.z+=yaw
for t in templates: t.hide_render=True
scene=bpy.context.scene
scene.render.engine='CYCLES'; scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.render.resolution_x=1280; scene.render.resolution_y=720; scene.render.resolution_percentage=100
scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get('Background'); bg.inputs[0].default_value=(0.62,0.72,0.74,1); bg.inputs[1].default_value=0.8
bpy.ops.object.light_add(type='SUN',location=spawn+Vector((100,-100,200)))
bpy.context.object.rotation_euler=(0.35,-0.45,-0.6); bpy.context.object.data.energy=2
# Runtime uses distance fog; keep QA lighting clear to expose geometry defects.
bpy.ops.object.camera_add(); cam=bpy.context.object; scene.camera=cam; cam.data.clip_end=2000
def render(name,position,target,lens):
    cam.location=position; cam.rotation_euler=(target-position).to_track_quat('-Z','Y').to_euler(); cam.data.lens=lens
    scene.render.filepath=os.path.join(ROOT,'tmp/genting-blender',name+'.png'); bpy.ops.render.render(write_still=True)
yaw=data['spawn']['yaw']; forward=Vector((math.sin(yaw),-math.cos(yaw),0))
if boundary_check:
    render('boundary-preview',spawn+Vector((25,25,24)),spawn,28)
    sys.exit(0)
render('road-preview',spawn-forward*9+Vector((0,0,4)),spawn+forward*45+Vector((0,0,2)),25)
render('highlands-preview',district+Vector((370,-470,350)),district+Vector((0,0,25)),28)
pagoda=bpy.context.scene.objects.get('Landmark_ChinSwee_Pagoda')
if pagoda:
    target=sum((pagoda.matrix_world@Vector(c) for c in pagoda.bound_box),Vector())/8
    render('chin-swee-preview',target+Vector((55,70,24)),target,40)
