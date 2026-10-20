import delivered from './artwork/manifest.json';
import type {Picture,Act,Card,TeachingVisual} from './types';
type Delivery={phone:string;tablet:string;width:number;height:number};
const manifest:Record<string,Delivery>=delivered;
/** Verified deliveries also resolve for cached lessons from older backend versions. */
export function resolvePicture(picture?:Picture|null):Picture|null{
 if(!picture)return null;const delivery=manifest[picture.id];return delivery?{...picture,...delivery,delivered:true}:picture;
}
export function actPicture(act:Act):Picture{
 return resolvePicture(act.map??{id:'map-'+act.id,ratio:'9:16',delivered:false,alt:act.place?.name??act.title})!;
}

export function teachingPictures(visuals?:TeachingVisual[]):Picture[]{
 return (visuals??[]).flatMap(v=>[...(v.items??[]),...(v.rows??[]).flat()].flatMap(item=>item.image?[item.image]:[]));
}
/** Feedback is intentionally excluded until a learner submits a response. */
export function cardPictures(card:Card,includeFeedback=false):Picture[]{
 const pictures=[...(card.image?[card.image]:[]),...teachingPictures(card.visuals),
  ...(card.kind==='revision'?card.rows.flatMap(row=>teachingPictures(row.visuals)):[]),
  ...(includeFeedback?teachingPictures(card.feedback_visuals):[])];
 return [...new Map(pictures.map(p=>[p.id,p])).values()];
}
