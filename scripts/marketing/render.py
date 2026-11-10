"""SaaS launch film: mental load -> connected work -> room for relationships.
Authored motion graphics, licensed property photograph, local Spanish voice.
No browser screenshots, customer data, external inference or commercial music.
"""
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pathlib import Path
from functools import lru_cache
import json, math, subprocess, sys
import numpy as np
import soundfile as sf

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/marketing'; WORK=ROOT/'.data/marketing-film'
W,H,FPS=1280,720,30
NAVY='#0b2148'; BLUE='#175cda'; ORANGE='#ff5a00'; WHITE='#f3f7ff'; MUTED='#bcd4f6'; INK='#10284d'
TIMELINE=json.loads((OUT/'journey-timeline.json').read_text()); SCENES=TIMELINE['scenes']
PHOTO=Image.open(OUT/'interior.webp').convert('RGB')
PHOTO_LARGE=ImageOps.fit(PHOTO,(850,790),method=Image.Resampling.LANCZOS)

@lru_cache(128)
def font(size,weight=650):
    f=ImageFont.truetype(str(ROOT/'scripts/marketing/Manrope.ttf'),size)
    f.set_variation_by_axes([weight]); return f

def clamp(v):return max(0,min(1,v))
def ease(v):return 1-(1-clamp(v))**4
def smooth(v):v=clamp(v);return v*v*(3-2*v)
def lerp(a,b,v):return a+(b-a)*v

def txt(im,x,y,s,size=32,color=INK,weight=650):
    ImageDraw.Draw(im).text((round(x),round(y)),s,font=font(size,weight),fill=color,anchor='lt')
def tw(s,size,weight=650):return ImageDraw.Draw(Image.new('RGB',(1,1))).textlength(s,font=font(size,weight))
def center(im,y,s,size=80,color=WHITE,weight=650):txt(im,(W-tw(s,size,weight))/2,y,s,size,color,weight)
def box(im,x,y,w,h,color,r=16,outline=None):
    ImageDraw.Draw(im).rounded_rectangle((round(x),round(y),round(x+w),round(y+h)),r,fill=color,outline=outline,width=1)
def line(im,points,color,width=3):ImageDraw.Draw(im).line(points,fill=color,width=width)
def dot(im,x,y,r,color):ImageDraw.Draw(im).ellipse((x-r,y-r,x+r,y+r),fill=color)
def check(im,x,y,size=18,color=BLUE):line(im,[(x,y+size*.45),(x+size*.35,y+size*.85),(x+size,y)],color,4)
def brand(im,light=True):
    txt(im,65,45,'kevvio',40,WHITE if light else NAVY,800)
    txt(im,65+tw('kevvio',40,800),45,'.',40,ORANGE if light else NAVY,800)

def reveal(im,x,y,s,size,color,t,delay=0,weight=650):
    p=ease((t-delay)/.58)
    if p<=0:return
    height=round(size*1.4); layer=Image.new('RGBA',(W,height))
    txt(layer,x,round(65*(1-p)),s,size,color,weight)
    im.paste(layer,(0,round(y)),layer)

def sticker(title,subtitle,kind='note'):
    card=Image.new('RGBA',(350,150));box(card,0,0,348,148,'#ffffff',16)
    dot(card,27,29,6,ORANGE);txt(card,46,18,title,22,BLUE,700)
    txt(card,25,63,subtitle,26,INK,600)
    if kind=='note':line(card,[(25,116),(244,116)],'#d9e4f3',4)
    return card

STICKERS=[sticker('Conversación','¿Podemos visitar?'),sticker('Pago por revisar','¿Ya llegó el abono?'),sticker('Por hacer','Retomar el contacto')]
PHOTO_CARD=Image.new('RGBA',(350,235));box(PHOTO_CARD,0,0,348,233,'#ffffff',16)
PHOTO_CARD.paste(ImageOps.fit(PHOTO,(326,171)),(12,12));txt(PHOTO_CARD,20,199,'¿Dónde quedó la foto?',19,INK,650)

def paste_card(im,card,x,y,angle):
    rotated=card.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    im.paste(rotated,(round(x),round(y)),rotated)

def noise(t,duration):
    im=Image.new('RGB',(W,H),NAVY);brand(im)
    reveal(im,76,105,'Tu negocio',82,WHITE,t,.1)
    reveal(im,72,198,'crece.',105,ORANGE,t,.5,750)
    reveal(im,78,310,'El caos, también.',54,WHITE,t,duration*.44)
    # The fragments intrude from different directions; they are the story's friction.
    poses=[(STICKERS[0],845,120,-7,.15),(PHOTO_CARD,896,317,7,.55),(STICKERS[1],765,515,-4,1.15),(STICKERS[2],960,-96,9,1.75)]
    for i,(card,x,y,angle,delay) in enumerate(poses):
        p=ease((t-delay)/.8)
        if p:
            dx=(1-p)*(490 if i%2==0 else 330)
            drift=6*math.sin(t*1.1+i)
            paste_card(im,card,x+dx,y+drift,angle+2*math.sin(t*.75+i))
    return im

def load(t,duration):
    im=Image.new('RGB',(W,H),WHITE);brand(im,False)
    p=t/duration
    if p<.34:
        reveal(im,76,150,'¿A quién ibas',88,NAVY,t,.12)
        reveal(im,76,250,'a llamar?',100,BLUE,t,.32,750)
    elif p<.65:
        local=t-duration*.34
        reveal(im,76,150,'¿Ese pago',100,NAVY,local)
        reveal(im,76,260,'llegó?',100,BLUE,local,.12,750)
    else:
        local=t-duration*.65
        reveal(im,76,145,'Tu memoria',96,NAVY,local)
        reveal(im,76,260,'tiene un límite.',82,NAVY,local,.15)
        length=tw('tiene un límite.',82)
        line(im,[(80,360),(80+length*ease((local-.2)/.8),360)],ORANGE,8)
    # Receding notification fragments give the question space.
    for j in range(3):
        x=1080+j*100+20*math.sin(t+j)
        box(im,x,120+j*176,220,100,'#e2ecfb',12)
        line(im,[(x+22,151+j*176),(x+164,151+j*176)],'#a7bfdf',5)
        line(im,[(x+22,178+j*176),(x+102,178+j*176)],'#a7bfdf',5)
    return im

def connect(t,duration):
    im=Image.new('RGB',(W,H),BLUE);brand(im)
    reveal(im,76,105,'Dale un lugar',76,WHITE,t,.12)
    reveal(im,76,190,'a todo.',80,WHITE,t,.34,750)
    words=['Inmuebles','Personas','Pagos'];targets=[64,460,856]
    y=280
    line(im,[(244,y+45),(1036,y+45)],'#86aff7',3)
    if t>2:dot(im,244+792*(((t-2)/2.5)%1),y+45,9,ORANGE)
    for i,(word,x) in enumerate(zip(words,targets)):
        p=ease((t-.7-i*.17)/1.1)
        entry=[-450,1700,1500][i]
        px=lerp(entry,x,p);py=lerp(720 if i==1 else 340,y,p)
        box(im,px,py,360,90,WHITE,16)
        txt(im,px+(360-tw(word,54,700))/2,py+18,word,54,NAVY,700)
    return im

def reach(t,duration):
    p=t/duration
    if p<.49:
        im=Image.new('RGB',(W,H),NAVY)
        offset=round(30+35*math.sin(t*.3));photo=PHOTO_LARGE.crop((offset,30,offset+730,750))
        im.paste(photo,(0,0));brand(im,False)
        reveal(im,779,110,'Presenta.',70,WHITE,t,.05)
        reveal(im,779,200,'Destaca.',70,ORANGE,t,.3,750)
        feature=min(2,int(max(0,t-.3)/(duration*.49/3)))
        if t>.3:
            check(im,779,313,28,ORANGE)
            txt(im,829,300,['Fotos','Enlaces','Videos'][feature],56,WHITE,600)
        return im
    local=t-duration*.49
    im=Image.new('RGB',(W,H),NAVY);brand(im)
    reveal(im,76,105,'Cada persona.',78,WHITE,local)
    reveal(im,76,200,'Su siguiente paso.',70,ORANGE,local,.18,700)
    names=['Interés','Visita','Seguimiento'];xs=[64,460,856]
    line(im,[(244,325),(1036,325)],'#5274a5',3)
    for i,(s,x) in enumerate(zip(names,xs)):
        q=ease((local-.35-i*.2)/.6)
        box(im,x,280+(1-q)*210,360,90,BLUE if i==2 else '#163661',16)
        txt(im,x+(360-tw(s,54))/2,298+(1-q)*210,s,54,WHITE,650)
    return im

def control(t,duration):
    im=Image.new('RGB',(W,H),WHITE);brand(im,False)
    reveal(im,76,105,'Bajo control.',92,BLUE,t,.15,750)
    items=['Contratos','Cobros','Inventario','Documentos']
    for i,s in enumerate(items):
        x=78+(i%2)*600;y=220+(i//2)*80
        p=ease((t-.55-i*.16)/.65)
        if p:
            txt(im,x+52,y+(1-p)*35,s,54,NAVY,600)
            check(im,x,y+13,29,BLUE)
    return im

def space(t,duration):
    im=Image.new('RGB',(W,H),ORANGE);brand(im,False)
    if t<duration*.4:
        reveal(im,76,145,'Menos ruido.',112,NAVY,t,.05,750)
        reveal(im,82,295,'Menos pendientes en la cabeza.',54,NAVY,t,.3,550)
    else:
        local=t-duration*.4
        reveal(im,76,145,'Más espacio.',112,NAVY,local,.02,750)
        reveal(im,82,290,'para tu próxima conexión.',53,NAVY,local,.22,550)
        q=ease((local-.45)/.8)
        line(im,[(82,511),(82+1020*q,511)],NAVY,5)
        if q>.9:
            line(im,[(1086,492),(1105,511),(1086,530)],NAVY,5)
    return im

RENDERERS=[noise,load,connect,reach,control,space]
def frame_at(time):
    i=next((j for j,s in enumerate(SCENES) if time<s['end']),len(SCENES)-1)
    scene=SCENES[i];t=time-scene['start'];im=RENDERERS[i](t,scene['duration'])
    # A brief directional wipe connects states without flashing or a UI-tour crossfade.
    if i and t<.28:
        prior=RENDERERS[i-1](SCENES[i-1]['duration']-.02,SCENES[i-1]['duration'])
        split=round(W*(1-ease(t/.28)))
        im.paste(prior.crop((0,0,split,H)),(0,0))
        if split>0:ImageDraw.Draw(im).rectangle((max(0,split-14),0,split,H),fill=ORANGE if i!=5 else BLUE)
    return im

def soundtrack():
    voice,sr=sf.read(WORK/'narration.wav');n=len(voice);time=np.arange(n)/sr
    # Original restrained pulse and transition texture. No sampled or licensed music.
    bed=np.zeros(n);rng=np.random.default_rng(824)
    for beat in np.arange(0,len(voice)/sr,.6):
        index=int(beat*sr);length=min(int(.5*sr),n-index);u=np.arange(length)/sr
        note=[146.83,220,293.66,185.0][int(beat/.6)%4]
        wave=(np.sin(2*np.pi*note*u)+.25*np.sin(2*np.pi*note*2*u))*.012*np.exp(-u*7)
        bed[index:index+length]+=wave
    for scene in SCENES[1:]:
        index=max(0,int((scene['start']-.15)*sr));length=min(int(.36*sr),n-index)
        u=np.linspace(0,1,length)
        noise=rng.standard_normal(length);noise=np.convolve(noise,np.ones(15)/15,mode='same')
        bed[index:index+length]+=noise*.045*np.sin(np.pi*u)**2
    duck=np.ones(n)
    for scene in SCENES:
        a=int(scene['speech_start']*sr);b=int(scene['speech_end']*sr);duck[a:b]=.38
    duck=np.convolve(duck,np.ones(1201)/1201,mode='same')
    fade=np.minimum(1,time/.5)*np.minimum(1,(time[-1]-time)/.7)
    sf.write(WORK/'mix.wav',voice+bed*duck*fade,sr)

def captures():
    folder=WORK/'frames';folder.mkdir(exist_ok=True)
    samples=[]
    for i,s in enumerate(SCENES):
        im=frame_at(s['start']+s['duration']*.72)
        im.save(folder/f'scene-{i+1}.png');samples.append(im.resize((640,360),Image.Resampling.LANCZOS))
    sheet=Image.new('RGB',(1280,1080),NAVY)
    for i,im in enumerate(samples):sheet.paste(im,((i%2)*640,(i//2)*360))
    sheet.save(WORK/'contact-sheet.jpg',quality=93)
    frame_at(SCENES[-1]['start']+SCENES[-1]['duration']*.83).save(OUT/'kevvio-poster.webp',quality=92)


def render():
    soundtrack();duration=TIMELINE['duration'];frames=math.ceil(duration*FPS)
    destination=WORK/'kevvio-journey-next.mp4'
    ff=subprocess.Popen(['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','pipe:0','-i',str(WORK/'mix.wav'),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-movflags','+faststart','-t',str(duration),str(destination)],stdin=subprocess.PIPE)
    for n in range(frames):
        ff.stdin.write(frame_at(n/FPS).tobytes())
        if n%180==0:print('Rendered',n,'/',frames,flush=True)
    ff.stdin.close()
    if ff.wait():raise SystemExit('FFmpeg failed')
    destination.replace(OUT/'kevvio-journey.mp4');captures()
    print('Created launch film:',round(duration,2),'seconds',flush=True)

if __name__=='__main__':
    if '--stills' in sys.argv:captures()
    else:render()
