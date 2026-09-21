"""Continuous height-field repair of the imported Genting mountain in Blender."""
import bpy, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

def rebuild_terrain(source, data, material):
    original=[v.co.copy() for v in source.data.vertices]
    bvh=BVHTree.FromPolygons(original,[p.vertices[:] for p in source.data.polygons])
    kd=KDTree(len(original))
    for i,v in enumerate(original): kd.insert((v.x,v.y,0),i)
    kd.balance()
    grid=data['terrainGrid']; step=grid['step']; x0,z0,x1,z1=grid['bounds']
    nx=round((x1-x0)/step)+1; nz=round((z1-z0)/step)+1
    heights=[]; repaired=0
    for j in range(nz):
        for i in range(nx):
            x=x0+i*step; y=-(z0+j*step)
            hit=bvh.ray_cast(Vector((x,y,5000)),Vector((0,0,-1)))[0]
            if hit is None:
                neighbors=kd.find_n((x,y,0),8)
                weights=[1/max(1,d)**2 for _,_,d in neighbors]
                h=sum(original[k].z*w for (_,k,_),w in zip(neighbors,weights))/sum(weights)
                # Extend the survey beyond its edge so fog never reveals a cut-out map.
                h-=min(110,neighbors[0][2]*.20)
                repaired+=1
            else: h=hit.z
            d,floor=grid['road'][j*nx+i]
            if floor is not None:
                t=max(0,min(1,(d-22)/40)); t=t*t*(3-2*t)
                h=floor*(1-t)+h*t
            heights.append(h)
    # Smooth the survey's long sparse triangles without lifting the road shelf.
    for iteration in range(3):
        previous=heights[:]
        for j in range(1,nz-1):
            for i in range(1,nx-1):
                k=j*nx+i
                if grid['road'][k][0]<25: continue
                heights[k]=previous[k]*.5+sum(previous[n] for n in [k-1,k+1,k-nx,k+nx])*.125
    vertices=[(x0+i*step,-(z0+j*step),heights[j*nx+i]) for j in range(nz) for i in range(nx)]
    faces=[]
    for j in range(nz-1):
        for i in range(nx-1):
            k=j*nx+i
            faces.extend([(k,k+nx,k+1),(k+1,k+nx,k+nx+1)])
    # Closed skirt and bottom: no open outer edge or missing underside.
    perimeter=list(range(nx))+[j*nx+nx-1 for j in range(1,nz)]+list(range(nz*nx-2,(nz-1)*nx-1,-1))+[j*nx for j in range(nz-2,0,-1)]
    bottom=min(heights)-180; base=len(vertices)
    vertices.extend((vertices[k][0],vertices[k][1],bottom) for k in perimeter)
    for i,k in enumerate(perimeter):
        n=(i+1)%len(perimeter); faces.append((k,perimeter[n],base+n,base+i))
    center=len(vertices);vertices.append(((x0+x1)/2,-(z0+z1)/2,bottom))
    for i in range(len(perimeter)): faces.append((base+i,base+(i+1)%len(perimeter),center))
    old=source.data; me=bpy.data.meshes.new('Continuous surveyed mountain'); me.from_pydata(vertices,[],faces);me.update();source.data=me
    if old.users==0:bpy.data.meshes.remove(old)
    me.materials.append(material)
    for p in me.polygons:p.use_smooth=True
    colors=me.color_attributes.new(name='MountainCover',type='FLOAT_COLOR',domain='POINT')
    rgba=[]
    for x,y,z in vertices:
        patch=.5+.25*math.sin(x*.023+math.sin(y*.017))+.25*math.cos(y*.031-x*.012)
        rgba.extend((.045+patch*.025,.09+patch*.045,.025+patch*.025,1))
    colors.data.foreach_set('color',rgba)
    material.use_nodes=True
    node=material.node_tree.nodes.new('ShaderNodeVertexColor'); node.layer_name='MountainCover'
    material.node_tree.links.new(node.outputs['Color'],material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    print(f'Closed mountain: {nx} x {nz} grid, {repaired} repaired/extended samples',flush=True)
    return BVHTree.FromPolygons(vertices,faces)
