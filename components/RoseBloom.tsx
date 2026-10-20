"use client";

import { useEffect, useRef, useState } from "react";
import type { FlowerKind } from "@/lib/flower-catalog";
import { flowerPhotos } from "@/lib/flower-photos";
import type { Locale } from "@/lib/content";
import { RecordedBloom } from "./RecordedBloom";

type Stage = "invitation" | "personalization" | "blooming" | "greeting" | "withering";
type Props = {stage: Stage;kind: FlowerKind;locale: Locale;paused: boolean;motionEnabled: boolean;onComplete:()=>void;onClosed:()=>void;onUnavailable:()=>void};
const duration = 7000;
const poses: Keyframe[] = [
  {offset:0,transform:"perspective(1000px) rotateY(-7deg) rotateX(3deg) scale(.88)",opacity:.8},
  {offset:.45,transform:"perspective(1000px) rotateY(2deg) rotateX(-1deg) scale(.96)",opacity:1},
  {offset:1,transform:"perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)",opacity:1},
];

/** Photographic depth reveal. It does not synthesize hidden petals or claim a captured growth sequence. */
export function RoseBloom(props: Props) {
  if(props.kind==='orchid'||props.kind==='alstroemeria')return <RecordedBloom {...props} kind={props.kind}/>;
  return <PhotographicReveal {...props}/>;
}
function PhotographicReveal(props: Props) {
  const {stage,kind,locale,motionEnabled}=props;
  const current=useRef(props);current.current=props;
  const plane=useRef<HTMLDivElement>(null);
  const image=useRef<HTMLImageElement>(null);
  const animation=useRef<Animation|null>(null);
  const [failed,setFailed]=useState(false);
  const [debug,setDebug]=useState(false);
  const [progress,setProgress]=useState(0);
  const completed=useRef(false);
  const photo=flowerPhotos[kind];
  useEffect(()=>{let active=true;image.current?.decode().catch(()=>{if(active){setFailed(true);current.current.onUnavailable();}});return()=>{active=false;};},[kind]);
  const paused=useRef(props.paused);paused.current=props.paused;
  useEffect(()=>{if(process.env.NODE_ENV==='development')setDebug(new URLSearchParams(location.search).has('bloomDebug'));},[]);

  function createAnimation() {
    animation.current?.cancel();
    if(!plane.current)return null;
    const a=plane.current.animate(poses,{duration,fill:'both',easing:'cubic-bezier(.25,.65,.3,1)'});
    a.pause();animation.current=a;
    return a;
  }
  function notify() {if(!completed.current){completed.current=true;current.current.onComplete();}}
  useEffect(()=>{
    let disposed=false;let loadTimer=0;
    animation.current?.cancel();animation.current=null;
    if(plane.current){plane.current.style.transform='';plane.current.style.opacity='';}
    if(stage==='greeting'){setProgress(1);return;}
    if(stage==='withering'){
      if(!motionEnabled||failed){current.current.onClosed();return;}
      const a=plane.current?.animate([{opacity:1,transform:'scale(1)'},{opacity:.65,transform:'scale(.9)'}],{duration:450,fill:'both',easing:'ease-in'});
      animation.current=a??null;
      a?.finished.then(()=>{if(!disposed)current.current.onClosed();}).catch(()=>{});
      return()=>{disposed=true;a?.cancel();};
    }
    if(stage!=='blooming')return;
    completed.current=false;setProgress(0);
    if(!motionEnabled||failed){notify();return;}
    loadTimer=window.setTimeout(()=>{if(!disposed){current.current.onUnavailable();notify();}},10000);
    image.current?.decode().then(()=>{
      if(disposed)return;clearTimeout(loadTimer);
      const a=createAnimation();if(!a){notify();return;}
      if(!document.hidden&&!paused.current)a.play();
      a.finished.then(()=>{if(!disposed){setProgress(1);notify();}}).catch(()=>{});
    }).catch(()=>{if(!disposed){setFailed(true);current.current.onUnavailable();notify();}});
    return()=>{disposed=true;clearTimeout(loadTimer);animation.current?.cancel();animation.current=null;};
  },[stage,kind,motionEnabled,failed]);
  useEffect(()=>{
    const sync=()=>{const a=animation.current;if(!a||stage!=='blooming')return;if(document.hidden||props.paused)a.pause();else if(a.playState!=='finished')a.play();};
    sync();document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[props.paused,stage]);
  useEffect(()=>()=>{animation.current?.cancel();},[]);
  function seek(value:number){const a=animation.current??createAnimation();if(!a)return;a.pause();a.currentTime=value*duration;setProgress(value);}
  function play(){const a=animation.current??createAnimation();a?.play();}
  return <div className="rose-bloom photo-bloom" data-rose-renderer="photograph" data-photo-progress={progress}>
    <div ref={plane} className="photo-motion">
      {!failed&&<img ref={image} className="photo-bloom-image" src={photo.src} alt="" aria-hidden="true" decoding="async" fetchPriority={kind==='rose'?'high':'auto'} onError={()=>{setFailed(true);current.current.onUnavailable();if(stage==='blooming')notify();}} />}
      {failed&&<p className="photo-unavailable" role="status">{locale==='vi'?'Ảnh hoa chưa tải được. Lời chúc của bạn vẫn sẵn sàng.':'The flower photo could not load. Your greeting is still available.'}</p>}
    </div>
    {debug&&<div className="photo-inspector">
      <label>Pose {progress.toFixed(2)}<input type="range" min="0" max="1" step="0.01" value={progress} onChange={e=>seek(Number(e.target.value))}/></label>
      <div><button onClick={play}>Play</button><button onClick={()=>animation.current?.pause()}>Pause</button><button onClick={()=>{completed.current=false;seek(0);play();}}>Replay</button><button onClick={()=>{seek(1);notify();}}>Skip</button></div>
    </div>}
  </div>;
}
