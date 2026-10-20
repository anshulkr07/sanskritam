import delivered from './artwork/manifest.json';
import type {Picture,Act} from './types';
type Delivery={phone:string;tablet:string;width:number;height:number};
const manifest:Record<string,Delivery>=delivered;
/** Delivery overlay preserves the backend content/hash contract and no-backend-edit scope. */
export function resolvePicture(picture?:Picture|null):Picture|null{
 if(!picture)return null;const delivery=manifest[picture.id];return delivery?{...picture,...delivery,delivered:true}:picture;
}
export function actPicture(act:Act):Picture{
 return resolvePicture(act.map??{id:'map-'+act.id,ratio:'9:16',delivered:false,alt:act.place?.name??act.title})!;
}
