import cv2, numpy as np, json, sys
from scipy import ndimage
# Recorta as 8 folhas de arte (tools/source_sheets/) e monta os spritesheets do jogo em public/assets/sprites/.
# Uso: python3 tools/build_sheets.py   (requer: pip install opencv-python-headless scipy numpy)
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,"tools","source_sheets")
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,"public","assets","sprites")
H={"lineup":"01_elenco_personagens","run":"02_heroi_andar_atirar","throw":"03_heroi_bomba_comemoracao","enemies":"04_inimigos_gef_caixas","vehicles":"05_veiculos_mega_draga","items":"06_animais_powerups_explosoes","bg":"07_cenarios_missoes_1_a_3","m4":"08_cenario_missao_4_vitoria"}
def _path(k): return os.path.join(SRC,H[k]+".png")
cache={}
def rgba(key, thr=228):
    if key in cache: return cache[key]
    im=cv2.imread(_path(key))
    near=(im.min(axis=2)>thr)
    lab,n=ndimage.label(near)
    border=list(set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0})
    bg=np.isin(lab,border)
    holes=near&~bg
    hl,hn=ndimage.label(holes)
    sizes=ndimage.sum(holes,hl,range(1,hn+1))
    big=np.isin(hl,[i+1 for i,s in enumerate(sizes) if s>400])
    a=(~(bg|big)).astype(np.uint8)*255
    a=cv2.erode(a,np.ones((2,2),np.uint8))
    cache[key]=np.dstack([im,a]); return cache[key]

def crop(key,box,keep="main",erase=()):
    x0,y0,x1,y1=box
    c=rgba(key)[y0:y1,x0:x1].copy()
    for (a,b,cc,d) in erase: c[b-y0:d-y0, a-x0:cc-x0, 3]=0
    a=c[:,:,3]>0
    lab,n=ndimage.label(a)
    if n>0 and keep=="main":
        sizes=ndimage.sum(a,lab,range(1,n+1)); main=int(np.argmax(sizes))+1
        km=lab==main; objs=ndimage.find_objects(lab); h,w=a.shape
        for i,sl in enumerate(objs):
            if i+1==main or sizes[i]<30: continue
            ys,xs=sl
            if ys.start>1 and xs.start>1 and ys.stop<h-1 and xs.stop<w-1: km|=lab==i+1
        c[:,:,3]=np.where(km,c[:,:,3],0)
    c=despill(c)
    ys,xs=np.where(c[:,:,3]>0)
    return c[ys.min():ys.max()+1, xs.min():xs.max()+1], x0+xs.min()

def despill(c):
    """Remove o halo claro (resto do fundo branco/compressão) nas bordas do recorte."""
    a=c[:,:,3]>0
    edge=a & ~cv2.erode(a.astype(np.uint8),np.ones((5,5),np.uint8)).astype(bool)  # faixa de ~2px na borda
    rgb=c[:,:,:3].astype(np.int16); mn=rgb.min(axis=2); sat=rgb.max(axis=2)-mn
    halo=edge & (mn>190) & (sat<30)
    c[:,:,3]=np.where(halo,0,c[:,:,3])
    soft=edge & ~halo & (mn>150) & (sat<25)          # cinza claro: escurece em vez de apagar
    c[:,:,:3]=np.where(soft[...,None],(c[:,:,:3]*0.6).astype(np.uint8),c[:,:,:3])
    return c

RES=2   # resolução das texturas em relação às unidades lógicas do jogo (o jogo renderiza com zoom 2)
OUTLINE=(18,24,20)  # BGR de #141812
def outline(img):
    """Contorno externo de 1px escuro, como nos sprites de Metal Slug."""
    img=np.pad(img,((RES,RES),(RES,RES),(0,0)))
    m=img[:,:,3]>0
    k=2*RES+1-2   # contorno de 1px lógico (= RES px na textura)
    ring=cv2.dilate(m.astype(np.uint8),np.ones((k,k),np.uint8)).astype(bool) & ~m
    img[ring]=(*OUTLINE,255)
    return img

def resize(c,s):
    w=max(1,round(c.shape[1]*s)); h=max(1,round(c.shape[0]*s))
    rgb=c[:,:,:3].astype(np.float32); al=c[:,:,3:].astype(np.float32)/255
    pm=cv2.resize(rgb*al,(w,h),interpolation=cv2.INTER_AREA); ar=cv2.resize(al,(w,h),interpolation=cv2.INTER_AREA)[...,None]
    out=np.where(ar>0.01,pm/np.maximum(ar,1e-3),0)
    a=np.where(ar>0.45,255,0)  # borda nítida (pixelArt)
    return np.dstack([np.clip(out,0,255),a]).astype(np.uint8)

def feet_x(c):
    a=c[:,:,3]>0; h=a.shape[0]; band=a[int(h*0.85):]
    xs=np.where(band)[1]
    return xs.mean() if len(xs) else c.shape[1]/2

def place(frame,img,mode="bottom",ax=None):
    FH,FW=frame.shape[:2]; h,w=img.shape[:2]
    if mode=="bottom":
        ax = w/2 if ax is None else ax
        x=int(round(FW/2-ax)); y=FH-h
    else:
        x=(FW-w)//2; y=(FH-h)//2
    # recorta o que sobrar
    sx0=max(0,-x); sy0=max(0,-y); dx0=max(0,x); dy0=max(0,y)
    ww=min(w-sx0,FW-dx0); hh=min(h-sy0,FH-dy0)
    if ww<=0 or hh<=0: return
    src=img[sy0:sy0+hh,sx0:sx0+ww]; dst=frame[dy0:dy0+hh,dx0:dx0+ww]
    m=src[:,:,3:]>0
    frame[dy0:dy0+hh,dx0:dx0+ww]=np.where(m,src,dst)

manifest=[]
def sheet(key,FW,FH,frames):
    """frames: list of dict(key,box,scale or fit,mode,anchor(src x),keep,erase,tint,flip). FW/FH/scale em unidades lógicas."""
    FW*=RES; FH*=RES
    S=np.zeros((FH,FW*len(frames),4),np.uint8)
    for i,f in enumerate(frames):
        c,ox=crop(f["src"],f["box"],f.get("keep","main"),f.get("erase",()))
        if "fit" in f:
            s=min((FW-2)/c.shape[1],(FH-2)/c.shape[0])*f["fit"]
        else: s=f["scale"]*RES
        img=resize(c,s)
        if f.get("outline",True): img=outline(img)
        if f.get("tint") is not None:
            t=np.array(f["tint"],np.float32); img[:,:,:3]=np.clip(img[:,:,:3]*0.45+t*0.55,0,255).astype(np.uint8)
        ax=None
        if f.get("mode","bottom")=="bottom":
            ax=(f["anchor"]-ox)*s if "anchor" in f else (img.shape[1]/2 if "fit" in f else feet_x(img))
        place(S[:,i*FW:(i+1)*FW],img,f.get("mode","bottom"),ax)
    cv2.imwrite(f"{OUT}/{key}.png",S)
    manifest.append({"key":key,"file":f"{key}.png","frameWidth":FW,"frameHeight":FH,"res":RES})

R=62/395.; T=62/400.; V=62/465.
run=[(10,236),(236,424),(424,612),(608,800),(796,1016)]
sheet("player_run",64,64,[dict(src="run",box=(a,112,b,512),scale=R) for a,b in run])
sheet("player_shoot",64,64,[dict(src="run",box=(a,112,b,512),scale=R) for a,b in run])
idle=dict(src="run",box=(10,540,252,996),scale=62/455.,erase=[(222,860,252,996)])
sheet("player_pose",64,64,[idle,
    dict(src="throw",box=(38,170,226,512),scale=T),
    dict(src="throw",box=(470,108,690,482),scale=T),
    dict(idle,tint=(60,60,255))])
win=[(35,226),(226,420),(405,615),(600,800),(790,1016)]
sheet("player_bomb_win",64,64,[
    dict(src="throw",box=(38,170,226,512),scale=T),
    dict(src="throw",box=(195,98,456,484),scale=T),
    dict(src="throw",box=(470,108,690,482),scale=T),
    dict(src="throw",box=(610,145,812,512),scale=T),
    dict(src="throw",box=(812,190,1016,512),scale=T)]+
    [dict(src="throw",box=(a,528,b,996),scale=V) for a,b in win])
G=60/240.
sheet("enemy_miner_hose",128,64,[
    dict(src="enemies",box=(30,75,216,292),scale=G,anchor=160),
    dict(src="enemies",box=(237,55,580,292),scale=G,anchor=385),
    dict(src="enemies",box=(532,68,822,302),scale=G,anchor=670),
    dict(src="enemies",box=(745,45,988,288),scale=G,anchor=870)])
L=62/290.
sheet("enemy_logger",128,64,[
    dict(src="enemies",box=(62,355,292,642),scale=L,anchor=150),
    dict(src="enemies",box=(292,340,560,640),scale=L,anchor=370),
    dict(src="enemies",box=(568,380,768,642),scale=L,anchor=665),
    dict(src="enemies",box=(782,380,1002,646),scale=L,anchor=900)])
sheet("ally_gef_heli",192,128,[dict(src="vehicles",box=(213,312,868,668),fit=1,mode="center",keep="all")])
boat=dict(src="vehicles",box=(60,38,556,276),fit=1)
sheet("slug_boat",128,80,[boat,boat])
quad=dict(src="vehicles",box=(658,30,938,276),fit=1)
sheet("slug_quad",128,80,[quad,quad])
dr=dict(src="vehicles",box=(268,716,992,1016),fit=1,keep="all")
sheet("boss_mega_draga",440,194,[dr,dict(dr,tint=(25,40,120))])
cg=[("items",(40,0,192,190),"all"),("items",(287,17,454,171),"main"),("items",(40,188,192,312),"main"),("items",(248,168,490,306),"main"),
    ("items",(40,318,226,448),"main"),("items",(290,318,414,446),"main"),("items",(40,453,240,562),"main"),("items",(280,455,446,572),"main")]
sheet("wildlife_cages",64,64,[dict(src=s,box=b,fit=1,keep=k) for s,b,k in cg])
pu=[(610,36,775,194),(796,36,964,197),(607,196,775,357),(821,221,942,329),(787,388,883,482),(901,364,968,479)]
sheet("powerups_hrf",32,32,[dict(src="items",box=b,fit=1) for b in pu])
ex=[(581,563,645,634),(674,560,757,637),(786,563,855,632),(883,556,970,637),(575,706,674,802),(703,664,820,802),(838,656,985,802),(545,836,697,1012),(701,813,837,1012),(836,823,1006,1012)]
sheet("fx_explosion",64,64,[dict(src="items",box=b,scale=0.36,mode="center",keep="all",outline=False) for b in ex])
sheet("fx_muzzle",16,16,[dict(src="items",box=(581,563,645,634),fit=1,mode="center",keep="all",outline=False)])
sheet("proj_bomb",14,14,[dict(src="throw",box=(672,40,760,132),fit=1,mode="center")])
sheet("hazard_hg_bucket",24,24,[dict(src="items",box=(45,560,142,702),fit=1,mode="center")])

# texturas opacas de cenário
bgim=cv2.imread(_path("bg"))
def save(key,img):
    cv2.imwrite(f"{OUT}/{key}.png",img); manifest.append({"key":key,"file":f"{key}.png","res":RES})
def up(img,w,h): return cv2.resize(img,(w*RES,h*RES),interpolation=cv2.INTER_AREA if img.shape[1]>w*RES else cv2.INTER_CUBIC)
save("ground_mud",up(bgim[56:121,705:763],64,64))
save("water",up(bgim[905:957,252:316],64,52))
save("plat_wood",up(bgim[563:587,172:322],96,16))
save("plat_raft",up(bgim[928:986,42:240],128,24))
# fundo da Missão 3 (Rio de Dragas) sem os rótulos "Layer", espelhado para rolagem contínua
m=np.zeros(bgim.shape[:2],np.uint8)
for (a,b,c,d) in [(608,712,683,742),(608,802,683,832),(18,976,80,1005)]: m[b:d,a:c]=255
inp=cv2.inpaint(bgim,m,7,cv2.INPAINT_TELEA)[712:1005,18:683]
pan=cv2.resize(inp,(round(665*450*RES/293),450*RES),interpolation=cv2.INTER_LANCZOS4)
pan=cv2.addWeighted(pan,1.5,cv2.GaussianBlur(pan,(0,0),2.0),-0.5,0)   # leve nitidez após ampliar
cv2.imwrite(f"{OUT}/bg_sky.jpg",np.hstack([pan,pan[:,::-1]]),[cv2.IMWRITE_JPEG_QUALITY,85])
manifest.append({"key":"bg_sky","file":"bg_sky.jpg","full":True,"res":RES})
json.dump(manifest,open(f"{OUT}/manifest.json","w"),indent=1)
print(len(manifest),"sheets")
