import {put,root} from './coach';
const commit='c594d15873c70241bc43fb46d3709900c8e374f9';let n=0;
for(const line of (await Bun.file(root+'/data/missions_locations.csv').text()).split(/\r?\n/)){
 const c=[...line.matchAll(/(?:^|;)("(?:[^"]|"")*"|[^;]*)/g)].map(m=>m[1].replace(/^"|"$/g,'').replaceAll('""','"'));if(!c[0]?.startsWith('location/avg_'))continue;
 put({id:'map:'+c[0],title:`${c[10]} ${c[1]} ${c[0]}`,body:`地图内部ID：${c[0]}；英文：${c[1]}；简体中文：${c[10]}；另一中文本地化：${c[20]||''}。仅名称对照，尚未核对现代房可用性、地图变体、出生侧和占领点布局。`,kind:'map_alias',url:`https://github.com/gszabi99/War-Thunder-Datamine/blob/${commit}/lang.vromfs.bin_u/lang/missions_locations.csv`,version:commit});n++;
}console.log(JSON.stringify({groundMapAliases:n}));
