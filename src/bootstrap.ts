import {root} from './coach';
import {fileURLToPath} from 'node:url';
// Pin all upstream files to the same revision. Downloads are explicit and local.
const commit='c594d15873c70241bc43fb46d3709900c8e374f9';
const base=`https://raw.githubusercontent.com/gszabi99/War-Thunder-Datamine/${commit}/`;
const files=[['char.vromfs.bin_u/config/wpcost.blkx','wpcost.blkx'],['lang.vromfs.bin_u/lang/units.csv','units.csv'],['lang.vromfs.bin_u/lang/missions_locations.csv','missions_locations.csv']];
for(const [source,target] of files){const response=await fetch(base+source);if(!response.ok)throw Error(`${source}: ${response.status}`);await Bun.write(root+'/data/'+target,await response.text());}
if(Bun.argv.includes('--full')){
 const response=await fetch(`https://api.github.com/repos/gszabi99/War-Thunder-Datamine/git/trees/${commit}?recursive=1`,{headers:{'User-Agent':'war-thunder-coach'}});
 if(!response.ok)throw Error(`GitHub tree: ${response.status}`);const tree=await response.json();if(tree.truncated)throw Error('Upstream tree truncated; stop rather than import incomplete paths.');await Bun.write(root+'/data/upstream-tree.json',JSON.stringify(tree));
}
for(const script of ['import-datamine.ts','import-maps.ts',...(Bun.argv.includes('--full')?['fetch-models.ts','fetch-equipment.ts']:[])]){
 const child=Bun.spawn(['bun',fileURLToPath(new URL(script,import.meta.url))],{stdout:'inherit',stderr:'inherit',env:{...process.env,WT_COACH_HOME:root}});if(await child.exited)throw Error(script+' failed');
}
console.log('Bootstrap completed. Raw field meanings and candidate BR still require verification.');
