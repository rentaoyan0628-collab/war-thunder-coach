"""Local CPU Chinese ASR + anonymous speaker labels. No paid API calls."""
import os, argparse, json, subprocess, uuid
from pathlib import Path
ROOT=Path(os.environ.get('WT_COACH_HOME', str(Path(__file__).resolve().parent.parent)))
os.environ['MODELSCOPE_CACHE']=str(ROOT/'models/modelscope')
os.environ['HF_HOME']=str(ROOT/'models/huggingface')
os.environ['TORCH_HOME']=str(ROOT/'models/torch')
p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('--start',type=float,default=0);p.add_argument('--duration',type=float);p.add_argument('--speaker-distance',type=float,default=0.7);p.add_argument('--output',default=str(ROOT/'data/transcript.json'));a=p.parse_args()
work=ROOT/'data/audio';work.mkdir(parents=True,exist_ok=True)
wav=work/(uuid.uuid4().hex+'.wav')
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(a.start),'-i',a.input]
if a.duration:cmd+=['-t',str(a.duration)]
subprocess.run(cmd+['-vn','-ac','1','-ar','16000',str(wav)],check=True)
from funasr import AutoModel
def cached(repo, fallback):
    path=ROOT/'models/modelscope/models'/repo/'snapshots/master'
    return str(path) if (path/'configuration.json').exists() else fallback
model=AutoModel(model=cached('iic--speech_seaco_paraformer_large_asr_nat-zh-cn-16k-common-vocab8404-pytorch','paraformer-zh'),vad_model=cached('iic--speech_fsmn_vad_zh-cn-16k-common-pytorch','fsmn-vad'),punc_model=cached('iic--punc_ct-transformer_cn-en-common-vocab471067-large','ct-punc'),spk_model=cached('iic--speech_campplus_sv_zh-cn_16k-common','cam++'),device='cpu',disable_update=True)
# FunASR's default backend assigns one speaker whenever fewer than 20 embeddings
# exist. The short-clip threshold is experimental and configurable; the bundled
# speaker1/speaker2/speaker1 fixture is used as a regression example, not accuracy proof.
import torch
import numpy as np
from sklearn.cluster import AgglomerativeClustering
class ShortClipCluster(torch.nn.Module):
    def __init__(self, original):
        super().__init__(); self.original=original
    def forward(self, x, oracle_num=None):
        np.save(str(a.output)+'.embeddings.npy',x.detach().cpu().numpy())
        if len(x)>=20:return self.original(x,oracle_num=oracle_num)
        if len(x)<2:return np.zeros(len(x),dtype=int)
        return AgglomerativeClustering(n_clusters=oracle_num,metric='cosine',linkage='average',distance_threshold=None if oracle_num else a.speaker_distance).fit_predict(x.detach().cpu().numpy())
model.cb_model=ShortClipCluster(model.cb_model)
result=model.generate(input=str(wav),batch_size_s=60)
segments=[]; speaker_map={}
for item in result:
    for s in item.get('sentence_info',[]):
        sp=s.get('spk')
        if sp is not None and sp not in speaker_map:speaker_map[sp]=len(speaker_map)
        label=chr(65+speaker_map[sp]) if sp is not None and speaker_map[sp]<26 else str(sp) if sp is not None else 'unknown'
        segments.append({'start':a.start+s.get('start',0)/1000,'end':a.start+s.get('end',0)/1000,'speaker':label,'text':s.get('text','')})
out={'backend':'local-funasr-cpu','source':a.input,'offset':a.start,'speakerLabels':'anonymous, may be wrong in mixed game audio','shortClipClustering':{'method':'average cosine','distance':a.speaker_distance,'status':'experimental'},'segments':segments,'raw':result}
Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'output':a.output,'segments':segments},ensure_ascii=False))
