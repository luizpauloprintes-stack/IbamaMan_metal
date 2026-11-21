import cv2, numpy as np, json, sys
from scipy import ndimage
# Recorta as 8 folhas de arte (tools/source_sheets/) e monta os spritesheets do jogo em public/assets/sprites/.
# Uso: python3 tools/build_sheets.py   (requer: pip install opencv-python-headless scipy numpy)
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC=os.path.join(ROOT,"tools","source_sheets")
OUT=sys.argv[1] if len(sys.argv)>1 else os.path.join(ROOT,"public","assets","sprites")
H={"lineup":"01_elenco_personagens","run":"02_heroi_andar_atirar","throw":"03_heroi_bomba_comemoracao","enemies":"04_inimigos_gef_caixas","vehicles":"05_veiculos_mega_draga","items":"06_animais_powerups_explosoes","bg":"07_cenarios_missoes_1_a_3","m4":"08_cenario_missao_4_vitoria"}
# IbamaMan v2 (artes em alta resolução enviadas depois das 8 folhas)
H.update({"hv_kneel":"hero_v2/hero_agachado.png","hv_shoot":"hero_v2/hero_tiro.jpg","hv_run":"hero_v2/hero_corrida.jpg","hv_stand":"hero_v2/hero_parado.jpg","hv_idle":"hero_v2/hero_em_pe.png","ev2":"hero_v2/inimigos_v2.jpg","baron_n":"hero_v2/barao_normal.png","baron_f":"hero_v2/barao_furioso.png","heli2":"hero_v2/heli_gef.jpg","draga2":"hero_v2/mega_draga.jpg","itens2":"hero_v2/itens_hd.jpg","cen2":"hero_v2/cenarios_hd.jpg"})
def _path(k): return os.path.join(SRC,H[k] if H[k].endswith((".jpg",".png")) else H[k]+".png")
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
    if n>0 and keep=="only":   # somente a maior peça (descarta restos de figuras vizinhas)
        sizes=ndimage.sum(a,lab,range(1,n+1))
        c[:,:,3]=np.where(lab==int(np.argmax(sizes))+1,c[:,:,3],0)
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
    """Contorno externo de 1px escuro, como nos sprites de arcade clássico."""
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
        if f.get("alpha") is not None: img[:,:,3]=(img[:,:,3]*f["alpha"]).astype(np.uint8)
        if f.get("tint") is not None:
            t=np.array(f["tint"],np.float32); img[:,:,:3]=np.clip(img[:,:,:3]*0.45+t*0.55,0,255).astype(np.uint8)
        ax=None
        if f.get("mode","bottom")=="bottom":
            ax=(f["anchor"]-ox)*s if "anchor" in f else (img.shape[1]/2 if "fit" in f else feet_x(img))
        place(S[:,i*FW:(i+1)*FW],img,f.get("mode","bottom"),ax)
    cv2.imwrite(f"{OUT}/{key}.png",S)
    manifest.append({"key":key,"file":f"{key}.png","frameWidth":FW,"frameHeight":FH,"res":RES})

# ---- IbamaMan (arte v2): quadros 96x64 lógicos para caber o clarão do tiro ----
PW=96
RUNV=[(23,418),(613,951),(1088,1459),(1671,2012),(2218,2576)]
SHOTV=[(84,600),(631,1140),(1152,1660),(1669,2160),(2144,2576)]
sheet("player_run",PW,64,[dict(src="hv_run",box=(a,8,b,632),scale=62/614.) for a,b in RUNV])
sheet("player_shoot",PW,64,[dict(src="hv_shoot",box=(a,14,b,636),scale=62/617.) for a,b in SHOTV])
idle=dict(src="hv_idle",box=(293,164,749,992),scale=62/819.)
sheet("player_pose",PW,64,[idle,
    dict(src="hv_kneel",box=(180,165,880,975),scale=46/801.),
    dict(src="hv_stand",box=(1218,296,1630,1012),scale=54/714.),
    dict(idle,tint=(60,60,255))])
T=62/400.; V=62/465.
win=[(35,226),(226,420),(405,615),(600,800),(790,1016)]
sheet("player_bomb_win",PW,64,[
    dict(src="throw",box=(38,170,226,512),scale=T),
    dict(src="throw",box=(195,98,456,484),scale=T),
    dict(src="throw",box=(470,108,690,482),scale=T),
    dict(src="throw",box=(610,145,812,512),scale=T),
    dict(src="throw",box=(812,190,1016,512),scale=T)]+
    [dict(src="throw",box=(a,528,b,996),scale=V) for a,b in win])
G=60/240.; G2=60/545.
sheet("enemy_miner_hose",128,64,[
    dict(src="enemies",box=(30,75,216,292),scale=G,anchor=160),                                   # parado (folha 04)
    dict(src="ev2",box=(935,470,1705,1040),scale=G2,anchor=1290,erase=[(1470,770,1705,1040)],keep="only"),  # jato (v2)
    dict(src="ev2",box=(1600,470,2078,1045),scale=G2,anchor=1765),                                # jato no chão (v2)
    dict(src="enemies",box=(745,45,988,288),scale=G,anchor=870)])                                 # fuga (folha 04)
L=62/290.; L2=62/565.
sheet("enemy_logger",128,84,[
    dict(src="ev2",box=(60,455,605,1030),scale=L2),       # motosserra ligada (v2)
    dict(src="ev2",box=(625,250,1170,1040),scale=L2),     # golpe com a lâmina erguida (v2)
    dict(src="enemies",box=(568,380,768,642),scale=L,anchor=665),
    dict(src="enemies",box=(782,380,1002,646),scale=L,anchor=900)])
sheet("ally_gef_heli",192,128,[dict(src="heli2",box=(215,138,2522,1006),fit=1,mode="center",keep="all")])
boat=dict(src="vehicles",box=(60,38,556,276),fit=1)
sheet("slug_boat",128,80,[boat,boat])
quad=dict(src="vehicles",box=(658,30,938,276),fit=1)
sheet("slug_quad",128,80,[quad,quad])
# Mega Draga HD: fumaça da chaminé removida (o jogo gera fumaça/explosões próprias)
dr=dict(src="draga2",box=(26,330,2400,1592),fit=1,keep="all",erase=[(1600,0,2400,428)])
sheet("boss_mega_draga",440,230,[dr,dict(dr,tint=(25,40,120))])
# ---- itens HD (hero_v2/itens_hd): gaiolas/animais, power-ups e explosões ----
cg=[(80,53,361,514),(434,71,829,510),(923,139,1495,510),(1555,191,2286,514),
    (61,596,441,932),(525,630,884,936),(970,582,1532,948),(1641,630,2318,902)]
sheet("wildlife_cages",64,64,[dict(src="itens2",box=b,fit=1,keep="all") for b in cg])
pu=[(680,1032,1043,1352),(1081,1033,1443,1352),(1483,1033,1846,1352),(1917,1038,2301,1334),(70,1573,254,1728),(278,1467,419,1728)]
sheet("powerups_hrf",32,32,[dict(src="itens2",box=b,fit=1) for b in pu])
# 10 quadros a partir de 4 fases: clarão -> bola de fogo -> fogo escuro -> fumaça que some
BURST=(489,1407,913,1743); BALL=(938,1414,1401,1743); DARK=(1427,1407,1866,1743); SMOKE=(1937,1407,2294,1743)
ex=[(BURST,.35,1),(BURST,.6,1),(BURST,.85,1),(BALL,.9,1),(BALL,1,1),(DARK,1,1),(DARK,1,.9),(SMOKE,.95,.85),(SMOKE,1,.6),(SMOKE,1.05,.3)]
sheet("fx_explosion",64,64,[dict(src="itens2",box=b,fit=k,mode="center",keep="all",outline=False,alpha=al) for b,k,al in ex])
sheet("fx_muzzle",16,16,[dict(src="itens2",box=(489,1407,913,1743),fit=1,mode="center",keep="all",outline=False)])
sheet("proj_bomb",14,14,[dict(src="throw",box=(672,40,760,132),fit=1,mode="center")])
sheet("hazard_hg_bucket",24,24,[dict(src="itens2",box=(70,998,309,1352),fit=1,mode="center")])

# ---- extras para as Missões 1, 2 e 4 (e props da demo) ----
sheet("boss_baron",96,84,[dict(src="baron_n",box=(300,105,871,1011),scale=80/898.),
                          dict(src="baron_f",box=(224,88,867,1004),scale=80/912.)])   # Barão do Garimpo: normal, enfurecido
sheet("ally_gef_agent",96,64,[dict(src="ev2",box=(2075,480,2576,1035),scale=62/545.),
                              dict(src="enemies",box=(276,680,433,962),scale=62/270.,anchor=340)])
sheet("prop_hg_barrels",32,40,[dict(src="itens2",box=(70,998,309,1352),fit=1),dict(src="itens2",box=(364,998,603,1352),fit=1)])
sheet("prop_logs",64,40,[dict(src="items",box=(305,575,493,690),fit=1)])
sheet("prop_sandbags",56,40,[dict(src="items",box=(31,818,180,927),fit=1)])

# texturas opacas de cenário
bgim=cv2.imread(_path("bg"))
def save(key,img):
    cv2.imwrite(f"{OUT}/{key}.png",img); manifest.append({"key":key,"file":f"{key}.png","res":RES})
def up(img,w,h): return cv2.resize(img,(w*RES,h*RES),interpolation=cv2.INTER_AREA if img.shape[1]>w*RES else cv2.INTER_CUBIC)
save("ground_mud",up(bgim[56:121,705:763],64,64))
save("water",up(bgim[905:957,252:316],64,52))
save("plat_wood",up(bgim[563:587,172:322],96,16))
sheet("plat_raft",128,48,[dict(src="cen2",box=(1870,1205,2304,1394),fit=1)])   # balsa de toras HD (deck ~20% do topo)
def panel(key, img, box, labels, mirror=True, h=450):
    """Recorta um painel de cenário, apaga os rótulos 'Layer', amplia (Lanczos + nitidez) e espelha p/ rolagem."""
    x0,y0,x1,y1=box
    p=img[y0:y1,x0:x1].copy()            # recorta ANTES do inpaint: a margem branca da folha não vaza
    m=np.zeros(p.shape[:2],np.uint8)
    for (a,b,c,d) in labels: m[max(0,b-y0):max(0,d-y0),max(0,a-x0):max(0,c-x0)]=255
    if m.any(): p=cv2.inpaint(p,m,9,cv2.INPAINT_TELEA)
    p=cv2.resize(p,(round(p.shape[1]*h*RES/p.shape[0]),h*RES),interpolation=cv2.INTER_LANCZOS4)
    p=cv2.addWeighted(p,1.5,cv2.GaussianBlur(p,(0,0),2.0),-0.5,0)
    if mirror: p=np.hstack([p,p[:,::-1]])
    cv2.imwrite(f"{OUT}/{key}.jpg",p,[cv2.IMWRITE_JPEG_QUALITY,82])
    manifest.append({"key":key,"file":f"{key}.jpg","res":RES})
    return manifest[-1]
m4im=cv2.imread(_path("m4"))
# fundo da Missão 3 (Rio de Dragas) = bg_sky, cenário completo usado na demo
panel("bg_sky",bgim,(22,716,679,1001),[(606,712,683,744),(606,800,683,834),(18,972,96,1005)])["full"]=True
cen=cv2.imread(_path("cen2"))
panel("bg_m1",cen,(78,68,2498,708),[])            # floresta preservada HD (Missão 1)
# igapó destruído HD (Missão 2): o céu vazado (branco) vira névoa em degradê
sw=cen[774:1381,76:1556].copy()   # sem a moldura escura do painel
near=sw.min(axis=2)>228; lab,_=ndimage.label(near)
sky=np.isin(lab,list(set(np.unique(lab[0]))-{0}))
grad=np.linspace(0,1,sw.shape[0])[:,None,None]
fill=((1-grad)*np.array([200,214,205])+grad*np.array([150,170,160])).astype(np.uint8)
sw=np.where(sky[...,None],np.broadcast_to(fill,sw.shape),sw)
panel("bg_m2",sw,(0,0,sw.shape[1],sw.shape[0]),[])
panel("bg_m4",m4im,(22,48,282,380),[])   # só o trecho sem a draga pintada (a Balsa-Fortaleza é o chefe)
panel("bg_restored",cen,(1636,771,2508,1150),[],mirror=False,h=135)   # rio restaurado HD (cartão da vitória)
json.dump(manifest,open(f"{OUT}/manifest.json","w"),indent=1)
print(len(manifest),"sheets")
