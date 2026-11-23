# War Thunder Coach / 独立战雷复盘助手

可安装的中文 **Codex Skill + 本地资料 MCP**。面向陆战历史录像，覆盖地面载具及其中的固定翼、直升机，首批资料候选为历史模式 BR 10.0 以上。

这是独立项目，可复用现有通用视频工具，不修改 Apex Coach 插件。当前发布形式是 Skill 与源码仓库，不是应用商店插件。

## 安装

需要 Bun、Git；视频裁剪需要 ffmpeg/ffprobe。基础检索与校验不需要 Python、API Key 或付费服务。

```powershell
git clone https://github.com/rentaoyan0628-collab/war-thunder-coach.git
cd war-thunder-coach
bun test
bun scripts/install-skill.ts
```

安装器将技能放到 `~/.codex/skills/war-thunder-review/SKILL.md`，并把模板路径替换为当前仓库绝对路径；已有技能默认不覆盖，确认替换时加 `--force`。安装器同时生成 `mcp.local.json`。也可将 `skill/` 安装到支持 SKILL.md 的其他代理，并替换 `<WT_COACH_HOME>`。

注册 MCP（将路径改为实际绝对路径）：

```powershell
codex mcp add war-thunder-reference -- bun C:/path/war-thunder-coach/src/server.ts
```

注册后检查当前聊天是否发现 `wt_search`、`wt_facts`、`wt_validate_review`。仅安装技能不会自动提供视频感知能力：另接通用视频工具，或让代理使用本机 ffmpeg 抽帧并实际检查图像。

## 数据初始化

新安装数据库为空。源码不附带原作者的私人经验库、录像、会话、模型权重或第三方拆包缓存。

```powershell
bun run bootstrap
# 可选：下载关联载具与装备配置，可能占用数 GB
bun run bootstrap --full
bun src/coach.ts status
bun src/coach.ts search 铠甲
```

初始化从公开上游下载固定版本。基础模式导入载具候选与地图名称，全量模式还导入关联配置。上游下载失败时显示错误；不把下载不完整称为完成。BR 推导只是候选筛选，不能代替游戏内历史模式 BR 核对。配置字段未解释单位时不能直接当实战结论。地图名称表也不等于已学习具体走线。

自有资料可按 `{id,title,body,url,version,kind}` JSON 导入：

```powershell
bun src/coach.ts import notes.json
bun src/coach.ts feedback "玩家解释的战术意图或机制纠正"
bun src/coach.ts validate review.json
```

默认数据目录是仓库根目录下的 `data/`；设置 `WT_COACH_HOME` 可将数据、模型放到其他盘。

## 复盘流程

先完整筛查阶段与结算，再利用击杀播报定位事件，逐杀检查发现目标、射击、关键损伤、移动、转火和后续处理。结合小地图与地形记录整段路线。使用受击回放观察关键部件，不能只看击毁瞬间。

完整报告包括事件对齐、对应截图、具体优点、战术评价和优先练习。未在素材中出现的事件列为缺失，不编造。未知感知时间时给条件分支，不声称玩家反应迟缓；证据和不确定细节放字段，正文以教练式教学为主。

用户要求完整报告时，粗筛、定位、细看、编写和校验都是中间步骤；通过进度消息说明后继续执行，不能以“还没做完”结束。仅在完整交付或确需用户解决的阻塞时结束。

结构见 [review-format.md](docs/review-format.md)。校验器检查证据引用、后见信息和教练字段，不证明视觉判断正确。

## 可选本地语音

`src/transcribe.py` 使用 FunASR Paraformer、VAD、标点、CAM++，CPU 推理，首次使用需下载模型。安装 Python 环境后参考 `requirements.lock.txt`；该锁文件来自 Windows 实验环境，并非所有平台均可原样安装。说话人 A/B/C 分组为实验性结果，混合游戏音频需要人工校对。

```powershell
python -X utf8 src/transcribe.py replay.mp4 --start 120 --duration 30 --output data/transcript.json
```

## 范围和来源

源码与方法用于复盘教学；不包含自动训练好的载具识别模型、向量 RAG、完整地图战术库或成熟混音说话人识别。依靠代理实际观察画面和检索资料。

拆包下载来源：[War-Thunder-Datamine](https://github.com/gszabi99/War-Thunder-Datamine)。游戏与第三方资料权利归原权利人；本仓库不重新分发这些缓存或模型。
