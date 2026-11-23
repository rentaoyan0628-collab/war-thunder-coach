import {db,put,root} from './coach';
const commit='c594d15873c70241bc43fb46d3709900c8e374f9';
const data=await Bun.file(root+'/data/wpcost.blkx').json();
function csv(line:string){return [...line.matchAll(/(?:^|;)("(?:[^"]|"")*"|[^;]*)/g)].map(m=>m[1].replace(/^"|"$/g,'').replaceAll('""','"'));}
const lines=(await Bun.file(root+'/data/units.csv').text()).split(/\r?\n/);const header=csv(lines[0]);const ci=header.indexOf('<Chinese>');const names=new Map<string,{en:string,zh:string}>();for(const line of lines.slice(1)){const c=csv(line);if(c[0])names.set(c[0],{en:c[1]||'',zh:c[ci]||''});}
const counts:Record<string,number>={};const vehicles:any[]=[];
for(const [id,v] of Object.entries(data) as [string,any][]){if(!v||typeof v!=='object'||!['air','tank','helicopter'].includes(v.unitMoveType)||id.startsWith('nt_')||/(?:_killstreak|_missile_test|_tutorial)$/.test(id))continue;
 const rank=v.economicRankTankHistorical??v.economicRankHistorical;if(typeof rank!=='number'||rank<27)continue;
 const name=names.get(id+'_shop')||names.get(id);const br=Math.round((1+rank/3)*10)/10;
 const context={unitMoveType:v.unitMoveType,unitClass:v.unitClass,country:v.country,economicRankTankHistorical:v.economicRankTankHistorical,economicRankHistorical:v.economicRankHistorical,rankField:v.economicRankTankHistorical!=null?'economicRankTankHistorical':'economicRankHistorical',brMapping:'1 + economicRank / 3, rounded to 1 decimal; verify against game UI before decisive advice'};
 const url=`https://github.com/gszabi99/War-Thunder-Datamine/blob/${commit}/char.vromfs.bin_u/config/wpcost.blkx`;
 put({id:'vehicle:'+id,title:`${name?.zh||id} ${name?.en||''} ${id}`,body:JSON.stringify({id,...context,BR_candidate:br}),url,version:commit,kind:'vehicle'});
 for(const [key,value] of Object.entries(context))db.query('INSERT OR REPLACE INTO facts VALUES(?,?,?,?,?,?,?,?,?)').run(id+':'+key,id,key,JSON.stringify(value),'',commit,url,id+'.'+key,'datamine');
 vehicles.push({id,...name,...context,BR_candidate:br});counts[v.unitMoveType]=(counts[v.unitMoveType]||0)+1;
}
const keep=new Set(vehicles.map(v=>'vehicle:'+v.id));db.transaction(()=>{for(const d of db.query("SELECT id FROM documents WHERE kind='vehicle'").all() as any[])if(!keep.has(d.id)){db.query('DELETE FROM documents WHERE id=?').run(d.id);db.query('DELETE FROM documents_fts WHERE id=?').run(d.id)}}).immediate();
await Bun.write(root+'/data/vehicles-10plus.json',JSON.stringify({commit,counts,vehicles},null,2));console.log(JSON.stringify({counts,total:vehicles.length,sample:vehicles.filter(v=>/leopard_2a7v|zztz99a|pantsir|vt4/.test(v.id))},null,2));
