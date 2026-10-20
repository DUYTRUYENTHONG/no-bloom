"use client";
import {useEffect,useRef,useState} from 'react';
import type {Locale} from '@/lib/content';
import styles from './RecordedBloom.module.css';
type Props={kind:'orchid'|'alstroemeria';stage:'invitation'|'personalization'|'blooming'|'greeting'|'withering';locale:Locale;paused:boolean;motionEnabled:boolean;onComplete:()=>void;onClosed:()=>void;onUnavailable:()=>void};
/** Real recorded petal opening, optimized locally. No synthesized geometry. */
export function RecordedBloom(props:Props){
 const {kind,stage,paused,motionEnabled,locale}=props;
 const video=useRef<HTMLVideoElement>(null),current=useRef(props),done=useRef(false);
 current.current=props;
 const [failed,setFailed]=useState(false),[ready,setReady]=useState(false);
 const source=`flowers/${kind}-bloom.mp4`;
 useEffect(()=>{
  if(stage==='withering'){current.current.onClosed();return;}
  if(stage!=='blooming'){video.current?.pause();return;}
  done.current=false;
  const finish=()=>{if(!done.current){done.current=true;current.current.onComplete();}};
  if(!motionEnabled||failed){finish();return;}
  const v=video.current;if(!v)return;
  v.currentTime=0;
  const fail=()=>{setFailed(true);current.current.onUnavailable();finish();};
  const ended=()=>finish();
  const sync=()=>{if(document.hidden||current.current.paused)v.pause();else v.play().catch(fail);};
  v.addEventListener('ended',ended);document.addEventListener('visibilitychange',sync);
  const timer=window.setTimeout(()=>{if(!document.hidden&&!current.current.paused)fail();},12000);
  // Stop the loading timeout once playback actually starts; hidden/paused time is unrestricted.
  const playing=()=>window.clearTimeout(timer);v.addEventListener('playing',playing);
  sync();
  return()=>{v.pause();clearTimeout(timer);v.removeEventListener('ended',ended);v.removeEventListener('playing',playing);document.removeEventListener('visibilitychange',sync);};
 },[stage,kind,motionEnabled,failed]);
 useEffect(()=>{const v=video.current;if(!v||stage!=='blooming')return;if(paused||document.hidden)v.pause();else v.play().catch(()=>{setFailed(true);current.current.onUnavailable();});},[paused,stage]);
 const showingVideo=stage==='blooming'&&motionEnabled&&!failed;
 return <div className={`rose-bloom ${styles.frame}`} data-rose-renderer="recorded-bloom" data-flower={kind}>
  <img className={styles.image} src={`flowers/${kind}-${stage==='greeting'?'open':'bud'}.webp`} alt="" aria-hidden="true"/>
  {(showingVideo||ready)&&<video ref={video} className={styles.video} style={{opacity:showingVideo&&ready?1:0}} src={source} muted playsInline preload="auto" aria-hidden="true" onLoadedData={()=>setReady(true)} onError={()=>{setFailed(true);current.current.onUnavailable();if(stage==='blooming'&&!done.current){done.current=true;current.current.onComplete();}}}/>}
  {failed&&<p className={styles.status} role="status">{locale==='vi'?'Video hoa chưa tải được. Bạn vẫn có thể xem lời chúc.':'The flower video could not load. Your greeting is still available.'}</p>}
 </div>;
}
