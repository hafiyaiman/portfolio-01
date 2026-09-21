"""Reference-led Genting architecture, keeping landmark locations in map space."""
import bpy, math, random
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

FIRST_WORLD=['building_fa7299d8-8b72-4586-b90e-676230c3eb85','building_8df8d671-6773-4135-a2b7-ed56f6f1a883']
PAGODA='building_07b85bd1-88e5-41d1-aa8c-8fad683b258b_part_0'

def road_clearance(buildings, samples, terrain):
    # Sample all seven corridor lanes, including a 3 m safety margin at each edge.
    points=[]
    for i,p in enumerate(samples):
        a=Vector(samples[max(0,i-1)]);b=Vector(samples[min(len(samples)-1,i+1)])
        t=b-a; right=Vector((t.z,0,-t.x)).normalized()
        for d in [-12,-8,-4,0,4,8,12]:
            q=Vector(p)+right*d;points.append(Vector((q.x,-q.z,0)))
    kd=KDTree(len(points))
    for i,p in enumerate(points):kd.insert(p,i)
    kd.balance(); adjustments={}; excluded=[]
    for o in buildings[:]:
        verts=[o.matrix_world@v.co for v in o.data.vertices]
        low=Vector(tuple(min(v[k] for v in verts) for k in range(3)))
        high=Vector(tuple(max(v[k] for v in verts) for k in range(3)))
        center=(low+high)/2;center.z=0;radius=(high-low).xy.length/2+80
        candidates=[points[i] for _,i,_ in kd.find_range(center,radius)]
        if not candidates:continue
        # A planar nearest-distance query expands the footprint by 5 m. Unlike
        # isolated vertical rays it cannot miss a thin wall between sample rows.
        bvh=BVHTree.FromPolygons([Vector((v.x,v.y,0)) for v in verts],[p.vertices[:] for p in o.data.polygons])
        def blocked(dx,dy):
            for p in candidates:
                x=p.x-dx;y=p.y-dy
                if low.x-5<=x<=high.x+5 and low.y-5<=y<=high.y+5 and bvh.find_nearest(Vector((x,y,0)),5)[0] is not None:return True
            return False
        if not blocked(0,0):continue
        nearest=kd.find(center)[0];away=center-nearest
        angle=math.atan2(away.y,away.x)
        solution=None
        for distance in range(4,65,4):
            for turn in [0,.25,-.25,.5,-.5,1,-1,2,-2,math.pi]:
                dx=math.cos(angle+turn)*distance;dy=math.sin(angle+turn)*distance
                if not blocked(dx,dy):solution=(dx,dy);break
            if solution:break
        if solution is None:
            excluded.append({'name':o.name,'reason':'source proxy spans road; no safe setback within 64 m'})
            buildings.remove(o);bpy.data.objects.remove(o,do_unlink=True);continue
        dx,dy=solution
        old=terrain.ray_cast(Vector((center.x,center.y,5000)),Vector((0,0,-1)))[0]
        new=terrain.ray_cast(Vector((center.x+dx,center.y+dy,5000)),Vector((0,0,-1)))[0]
        dz=new.z-old.z if old is not None and new is not None else 0
        for v in o.data.vertices:v.co+=Vector((dx,dy,dz))
        o.data.update()
        adjustments[o.name]=[dx,dz,-dy]
    return adjustments,excluded

def author_landmarks(buildings,terrain,mesh,box,rod,text,mats,material):
    replaced=[];created=[]
    # The export includes an enclosing 358 x 426 m park block covering the
    # actual smaller structures, and a duplicate of the Grand's Y-shaped wing.
    for o in buildings[:]:
        if o.name in ['building_213','building_43']:
            replaced.append(o.name);buildings.remove(o);bpy.data.objects.remove(o,do_unlink=True)
    def ground(x,y):
        hit=terrain.ray_cast(Vector((x,y,5000)),Vector((0,0,-1)))[0]
        return hit.z if hit is not None else 0
    # First World's defining feature is continuous green/yellow facades with
    # sweeping rainbow panels, not randomly coloured separate hotel blocks.
    rainbow=material('First World rainbow facade',(1,1,1),.83)
    image=bpy.data.images.new('First World coloured elevation',width=768,height=512)
    palette=[(.89,.69,.10),(.91,.34,.10),(.79,.12,.12),(.17,.33,.64),(.09,.48,.25),(.57,.74,.16)]
    pixels=[]
    for y in range(512):
        for x in range(768):
            u=x/768;v=y/512
            band=int((u*4.5+v*1.1+math.sin(v*2)*.7))%len(palette)
            c=palette[band]
            if (x%16 in range(5,12)) and (y%17 in range(5,12)): c=(.10,.21,.20)
            if y%17<2: c=tuple(n*.82 for n in c)
            pixels.extend((*c,1))
    image.pixels.foreach_set(pixels);image.pack()
    tex=rainbow.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    rainbow.node_tree.links.new(tex.outputs['Color'],rainbow.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    for index,prefix in enumerate(FIRST_WORLD):
        group=[o for o in buildings if o.name.startswith(prefix)]
        if not group:continue
        import numpy as np
        xy=np.array([(v.co.x,v.co.y) for o in group for v in o.data.vertices])
        mean=xy.mean(axis=0);_,vectors=np.linalg.eigh(np.cov(xy.T));axis=vectors[:,-1]
        side=np.array([-axis[1],axis[0]])
        along=(xy-mean)@axis;across=(xy-mean)@side
        center=mean+axis*(along.min()+along.max())/2+side*(across.min()+across.max())/2
        length=min(175,max(110,float(along.max()-along.min())*.91));height=92 if index==0 else 98
        cx,cy=float(center[0]),float(center[1]);base=ground(cx,cy)
        vertices=[];faces=[];uvs=[];segments=36;thickness=22
        for j in range(segments+1):
            t=j/segments;u=(t-.5)*length;curve=9*math.cos((t-.5)*math.pi)
            for z,s in [(0,-1),(0,1),(height,-1),(height,1)]:
                p=center+axis*u+side*(curve+s*thickness/2)
                vertices.append((float(p[0]),float(p[1]),base+z))
                uvs.append((t,z/height))
        for j in range(segments):
            a=j*4;b=a+4;faces.extend([(a,b,b+2,a+2),(a+1,a+3,b+3,b+1),(a+2,b+2,b+3,a+3),(a,a+1,b+1,b)])
        faces.extend([(0,2,3,1),(segments*4,segments*4+1,segments*4+3,segments*4+2)])
        tower=mesh(f'Landmark_FirstWorld_Tower_{index+1}',vertices,faces,'Hotel cream')
        tower.data.materials.clear();tower.data.materials.append(rainbow);tower.data.materials.append(mats['Hotel cream'])
        uv=tower.data.uv_layers.new(name='Full facade elevation')
        for p in tower.data.polygons:
            if abs(p.normal.z)>.5:p.material_index=1
            for li in p.loop_indices:uv.data[li].uv=uvs[tower.data.loops[li].vertex_index]
        created.append(tower)
        for o in group:
            replaced.append(o.name);buildings.remove(o);bpy.data.objects.remove(o,do_unlink=True)
    pagoda=next((o for o in buildings if o.name==PAGODA),None)
    if pagoda:
        verts=[v.co for v in pagoda.data.vertices]
        x=(min(v.x for v in verts)+max(v.x for v in verts))/2;y=(min(v.y for v in verts)+max(v.y for v in verts))/2;z=ground(x,y)
        before=set(bpy.context.scene.objects)
        for level in range(9):
            h=z+level*3.25;r=4.8-level*.24
            bpy.ops.mesh.primitive_cylinder_add(vertices=8,radius=r*.68,depth=2.65,location=(x,y,h+1.325))
            bpy.context.object.data.materials.append(mats['Hotel cream'])
            for i in range(8):
                a=(i+.5)*math.tau/8;px=x+math.cos(a)*r*.72;py=y+math.sin(a)*r*.72
                rod('Pagoda vermilion columns',(px,py,h),(px,py,h+2.75),.09,'Temple red')
            v=[]
            for rad,dh in [(r*1.13,2.85),(r,2.50),(r*.48,3.35)]:
                v.extend((x+math.cos(i*math.tau/8)*rad,y+math.sin(i*math.tau/8)*rad,h+dh) for i in range(8))
            f=[(j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i) for j in range(2) for i in range(8)]
            mesh('Glazed swept eaves',v,f,'Roof tile')
        rod('Pagoda finial',(x,y,z+29),(x,y,z+32),.15,'Gold')
        parts=list(set(bpy.context.scene.objects)-before)
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts:o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();tower=bpy.context.object;tower.name='Landmark_ChinSwee_Pagoda'
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        created.append(tower);replaced.append(pagoda.name);buildings.remove(pagoda);bpy.data.objects.remove(pagoda,do_unlink=True)
    # Genting Grand's round rooftop crown and red name identify its white Y-plan.
    grand=next((o for o in buildings if o.name=='building_3be171ad-eda3-477c-8eca-b9b270a80236_part_0'),None)
    if grand:
        c=sum((v.co for v in grand.data.vertices),Vector())/len(grand.data.vertices);top=max(v.co.z for v in grand.data.vertices)
        bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=10,depth=5,location=(c.x,c.y,top+2.5))
        crown=bpy.context.object;crown.name='Landmark_GentingGrand_Crown';crown.data.materials.append(mats['Hotel cream']);created.append(crown)
        title=text('GENTING GRAND',(c.x,c.y-10.1,top+2),2.4,'Temple red');title.name='Landmark_GentingGrand_Sign';created.append(title)
    # Bake transforms so the same clearance pass checks authored and mapped meshes.
    from mathutils import Matrix
    for o in created:
        o.data.transform(o.matrix_world);o.matrix_world=Matrix.Identity(4)
    return created,replaced
