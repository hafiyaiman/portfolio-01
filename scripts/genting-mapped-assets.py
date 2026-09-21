"""Blender asset authoring helpers; imported by build-genting-blender.py."""
import bpy, bmesh, math, random, os, json, runpy
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

def mapped_scenery(root, out, mats, material, trees, data, mesh, box, rod, text):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(root,'public/maps/genting/hybrid-scenery.glb'))
    imported=set(bpy.context.scene.objects)-before
    kept=[]
    for o in imported:
        if o.type=='MESH' and (o.name=='tinMesh' or o.name.startswith('building_')):
            world=o.matrix_world.copy(); o.parent=None
            o.data.transform(world); o.matrix_world=Matrix.Identity(4)
            kept.append(o)
    for o in imported:
        if o not in kept: bpy.data.objects.remove(o,do_unlink=True)
    terrain=next(o for o in kept if o.name=='tinMesh'); terrain.name='Terrain'
    terrain_bvh=runpy.run_path(os.path.join(root,'scripts/genting-terrain.py'))['rebuild_terrain'](terrain,data,material('Mountain moss',(1,1,1),1))
    # A repeatable facade tile: inset dark glazing, slim mullions, sill and shaded reveal.
    facades=[]
    for name,base in [('Resort ivory',(.80,.79,.69)),('Resort white',(.87,.87,.81)),('Resort pale yellow',(.83,.78,.51)),('Resort stone',(.67,.69,.63))]:
        mat=material(name,(1,1,1),.82)
        img=bpy.data.images.new(name+' facade',width=128,height=128)
        pixels=[]
        for y in range(128):
            for x in range(128):
                noise=random.uniform(-.012,.012)
                c=base
                if 28<x<100 and 32<y<108: c=(.10,.19,.22) if y<102 else (.055,.10,.12)
                if 62<x<66 and 35<y<98: c=(.40,.43,.40)
                if 19<x<109 and 30<y<35: c=tuple(v*.65 for v in base)
                if y<3: c=tuple(v*.85 for v in base)
                pixels.extend((*[max(0,v+noise) for v in c],1))
        img.pixels.foreach_set(pixels); img.pack()
        tex=mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=img
        mat.node_tree.links.new(tex.outputs['Color'],mat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
        facades.append(mat)
    roof=material('Weathered roof',(1,1,1),.95)
    roof_image=bpy.data.images.new('Roof seams and weathering',width=256,height=256)
    pixels=[]
    for y in range(256):
        for x in range(256):
            shade=.34+random.uniform(-.018,.018)+.012*math.sin(y*.1)
            if x%32<2: shade-=.09
            if y%128<2: shade-=.045
            pixels.extend((shade*.94,shade,shade*.98,1))
    roof_image.pixels.foreach_set(pixels); roof_image.pack()
    tex=roof.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=roof_image
    roof.node_tree.links.new(tex.outputs['Color'],roof.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    buildings=sorted([o for o in kept if o!=terrain],key=lambda o:o.name)
    for i,o in enumerate(buildings):
        o.data.materials.clear()
        o.data.materials.append(mats['Concrete'] if 'footprint_base' in o.name else facades[i%len(facades)]); o.data.materials.append(roof)
        uv=o.data.uv_layers.new(name='Facade metres')
        for p in o.data.polygons:
            p.material_index=1 if abs(p.normal.z)>.65 else 0
            for li in p.loop_indices:
                co=o.data.vertices[o.data.loops[li].vertex_index].co
                uv.data[li].uv=(co.x/12,co.y/12) if p.material_index==1 else ((co.y if abs(p.normal.x)>abs(p.normal.y) else co.x)/3.2,co.z/3.25)
    architecture=runpy.run_path(os.path.join(root,'scripts/genting-landmarks.py'))
    authored,replaced=architecture['author_landmarks'](buildings,terrain_bvh,mesh,box,rod,text,mats,material)
    buildings.extend(authored)
    adjustments,excluded=architecture['road_clearance'](buildings,data['roadSamples'],terrain_bvh)
    bv=[];bf=[]
    for o in buildings:
        start=len(bv);bv.extend(o.matrix_world@v.co for v in o.data.vertices)
        bf.extend(tuple(start+j for j in p.vertices) for p in o.data.polygons)
    building_bvh=BVHTree.FromPolygons(bv,bf)
    grounded=[]
    for x,y,z,s,yaw,variant in trees:
        hit=terrain_bvh.ray_cast(Vector((x,-z,5000)),Vector((0,0,-1)))
        if hit[0] is None: continue
        # Crown-sized clearance around all mapped roofs, including irregular footprints.
        radius=6*s
        offsets=[(0,0)]+[(math.cos(a*math.tau/8)*radius,math.sin(a*math.tau/8)*radius) for a in range(8)]
        if any(building_bvh.ray_cast(Vector((x+dx,-z+dy,5000)),Vector((0,0,-1)))[0] is not None for dx,dy in offsets): continue
        grounded.append([x,hit[0].z,z,s,yaw,variant])
    json.dump(grounded,open(os.path.join(out,'forest.json'),'w'))
    json.dump({'mappedBuildings':len(buildings),'trees':len(grounded),'treeVariants':8,'placement':'mapped landmarks; explicit road-clearance setbacks','replaced':replaced,'setbacks':adjustments,'excluded':excluded},open(os.path.join(out,'asset-manifest.json'),'w'),indent=2)
    print(f'Mapped terrain, {len(buildings)} buildings, {len(grounded)} grounded trees',flush=True)
    return {terrain.name}|{o.name for o in buildings}

def tree_kit(out,mats,material,mesh):
    bark=mats['Bark']; bark.diffuse_color=(1,1,1,1)
    img=bpy.data.images.load(os.path.join(out,'textures/Bark012_1K-JPG_Color.jpg')); img.pack()
    tex=bark.node_tree.nodes.new('ShaderNodeTexImage'); tex.image=img
    bark.node_tree.links.new(tex.outputs['Color'],bark.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    leafmat=material('Broadleaf greens',(1,1,1),.9)
    node=leafmat.node_tree.nodes.new('ShaderNodeVertexColor'); node.layer_name='LeafColor'
    leafmat.node_tree.links.new(node.outputs['Color'],leafmat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    leafmat.use_backface_culling=False
    scanned=material('Scanned broadleaf cutouts',(1,1,1),.88)
    scanned.use_backface_culling=False
    color_image=bpy.data.images.load(os.path.join(out,'textures/leaves/LeafSet024_1K-JPG_Color.jpg'));color_image.pack()
    opacity_image=bpy.data.images.load(os.path.join(out,'textures/leaves/LeafSet024_1K-JPG_Opacity.jpg'));opacity_image.colorspace_settings.name='Non-Color';opacity_image.pack()
    color_node=scanned.node_tree.nodes.new('ShaderNodeTexImage');color_node.image=color_image
    alpha_node=scanned.node_tree.nodes.new('ShaderNodeTexImage');alpha_node.image=opacity_image
    threshold=scanned.node_tree.nodes.new('ShaderNodeMath');threshold.operation='GREATER_THAN';threshold.inputs[1].default_value=.5
    bs=scanned.node_tree.nodes.get('Principled BSDF')
    scanned.node_tree.links.new(color_node.outputs['Color'],bs.inputs['Base Color'])
    scanned.node_tree.links.new(alpha_node.outputs['Color'],threshold.inputs[0]);scanned.node_tree.links.new(threshold.outputs[0],bs.inputs['Alpha'])
    for variant in range(8):
        random.seed(91+variant)
        parent=bpy.data.objects.new(f'TropicalTree_{variant}',None); bpy.context.collection.objects.link(parent)
        verts=[]; faces=[]; uvs=[]
        def branch(points,radii):
            start=len(verts); n=6
            for j,p in enumerate(points):
                direction=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(0,j-1)])
                rot=direction.to_track_quat('Z','Y')
                for k in range(n):
                    verts.append(Vector(p)+rot@Vector((math.cos(k*math.tau/n)*radii[j],math.sin(k*math.tau/n)*radii[j],0)))
                    uvs.append((k/n,j*.7))
            for j in range(len(points)-1):
                for k in range(n): faces.append((start+j*n+k,start+j*n+(k+1)%n,start+(j+1)*n+(k+1)%n,start+(j+1)*n+k))
            faces.append(tuple(start+k for k in reversed(range(n))))
            faces.append(tuple(start+(len(points)-1)*n+k for k in range(n)))
        height=[14,19,12,16,4.2,6,2.4,3.5][variant]
        bend=Vector((random.uniform(-.8,.8),random.uniform(-.8,.8),0))
        branch([(0,0,0),(.05,.08,min(1.5,height*.3)),bend*.5+Vector((0,0,height*.45)),bend+Vector((0,0,height*(1 if variant in [4,5] else .8)))],[.24 if variant in [4,5] else .40,.20,.12,.06])
        for k in range(5 if variant<4 else 0):
            a=k*math.tau/5
            branch([(math.cos(a)*1.1,math.sin(a)*1.1,-.08),(0,0,1.4)],[.06,.20])
        crowns=[]
        for k in range(16 if variant<4 else (0 if variant<6 else 9)):
            a=k*2.399+random.uniform(-.3,.3); t=k/12
            z=height*(.30+min(t,1)*.48); spread=(3.5+random.random()*2)*(1-.35*min(t,1)) if variant<4 else 1+random.random()*.8
            base=bend*(z/height)+Vector((0,0,z))
            end=base+Vector((math.cos(a)*spread,math.sin(a)*spread,1.4))
            branch([base,base.lerp(end,.55)-Vector((0,0,.25)),end],[.10,.055,.018])
            crowns.append((end,2.1+random.random()*.7 if variant<4 else 1.1))
            for j in [-1,1]:
                tip=end+Vector((math.cos(a+j*.8)*1.2,math.sin(a+j*.8)*1.2,.6))
                branch([base.lerp(end,.65),tip],[.04,.008]); crowns.append((tip,1.6 if variant<4 else .8))
        fern_fronds=[]
        if variant in [4,5]:
            for k in range(11):
                a=k*math.tau/11;length=random.uniform(2.6,4.2)
                direction=Vector((math.cos(a),math.sin(a),0));side=Vector((-math.sin(a),math.cos(a),0))
                fern_fronds.append((direction,side,length))
                points=[bend+direction*(length*j/16)+Vector((0,0,height+.9*math.sin(j/16*math.pi)-1.1*(j/16)**2)) for j in range(17)]
                branch(points,[.028*(1-j/19) for j in range(17)])
        trunk=mesh('Branchwork',verts,faces,'Bark'); trunk.parent=parent
        uv=trunk.data.uv_layers.new(name='Bark wrap')
        for loop in trunk.data.loops: uv.data[loop.index].uv=uvs[loop.vertex_index]
        for p in trunk.data.polygons: p.use_smooth=True
        lv=[]; lf=[]; colors=[]; leaf_uv=[]
        for center,radius in crowns:
            for j in range(42):
                a=random.random()*math.tau; r=radius*math.sqrt(random.random()); h=random.uniform(-.8,.8)
                p=center+Vector((math.cos(a)*r,math.sin(a)*r,h))
                length=random.uniform(.65,1.1) if variant<4 else random.uniform(.4,.7); width=length*.72
                direction=Vector((math.cos(a),math.sin(a),random.uniform(-.65,.65))).normalized()
                side=Vector((-math.sin(a),math.cos(a),0))
                start=len(lv)
                lv.extend([p-direction*length*.5-side*width*.5,p+direction*length*.5-side*width*.5,p+direction*length*.5+side*width*.5,p-direction*length*.5+side*width*.5])
                lf.append((start,start+1,start+2,start+3))
                tile=random.randrange(9);u=(tile%3)/3;v=(tile//3)/3
                leaf_uv.extend([(u,v),(u,v+1/3),(u+1/3,v+1/3),(u+1/3,v)])
                colors.extend([(.1,.25,.055,1)]*4)
        if variant in [4,5]:
            # Tree-fern crowns: arched fronds with many paired narrow pinnae.
            for direction,side,length in fern_fronds:
                for j in range(1,16):
                    t=j/16;p=bend+direction*(length*t)+Vector((0,0,height+.9*math.sin(t*math.pi)-1.1*t*t))
                    width=math.sin(t*math.pi)*.7
                    for s in [-1,1]:
                        n=len(lv);lv.extend([p,p+side*width*s-direction*.16,p+side*width*.82*s+direction*.24])
                        lf.append((n,n+1,n+2));colors.extend([(.08,.23,.045,1)]*3)
        foliage=mesh('Leaves',lv,lf,'Leaf mid'); foliage.parent=parent
        foliage.data.materials.clear(); foliage.data.materials.append(leafmat if variant in [4,5] else scanned)
        if variant not in [4,5]:
            uv=foliage.data.uv_layers.new(name='Scanned leaf atlas')
            for loop in foliage.data.loops:uv.data[loop.index].uv=leaf_uv[loop.vertex_index]
        col=foliage.data.color_attributes.new(name='LeafColor',type='FLOAT_COLOR',domain='POINT')
        col.data.foreach_set('color',[n for c in colors for n in c])
    bpy.ops.export_scene.gltf(filepath=os.path.join(out,'tropical-trees.glb'),export_format='GLB')
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'tropical-tree-kit.blend'),compress=True)
