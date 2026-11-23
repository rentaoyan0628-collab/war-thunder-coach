import {test,expect} from 'bun:test';
import {put,search,validate,db,recordFeedback} from './coach';
test('Chinese lookup and replacement preserve source',()=>{put({id:'test',title:'中文雷达告警',body:'测试检索词甲',url:'source'});expect(search('雷达告警').some((x:any)=>x.id==='test')).toBe(true);put({id:'test',title:'改后',body:'新词乙'});expect(search('测试检索词甲').some((x:any)=>x.id==='test')).toBe(false);db.query('DELETE FROM documents WHERE id=?').run('test');db.query('DELETE FROM documents_fts WHERE id=?').run('test')});
test('post-event identity cannot criticize earlier decision',()=>{expect(validate({evidence:[{id:'killcam',availableAt:90}],claims:[{id:'c',evidenceIds:['killcam'],decisionAt:60,use:'decision'}]}).valid).toBe(false);expect(validate({evidence:[{id:'killcam',availableAt:90}],claims:[{id:'c',evidenceIds:['killcam'],use:'outcome'}]}).valid).toBe(true)});
test('user correction is available to the same search used by MCP',()=>{
  const id=recordFeedback('回归样本紫色云杉：用户解释混装尾翼弹用于车体备弹');
  try {
    expect(search('回归样本紫色云杉').some((x:any)=>x.id===id&&x.kind==='user')).toBe(true);
    expect(db.query('SELECT body FROM feedback WHERE id=?').get(Number(id.split(':')[1]))).toBeTruthy();
  } finally {
    db.query('DELETE FROM documents WHERE id=?').run(id);
    db.query('DELETE FROM documents_fts WHERE id=?').run(id);
    db.query('DELETE FROM feedback WHERE id=?').run(Number(id.split(':')[1]));
  }
});
