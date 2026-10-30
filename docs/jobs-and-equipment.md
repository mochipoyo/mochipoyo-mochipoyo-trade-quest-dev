# 職業と装備（jobs-and-equipment）

## 1. 既存12職業（維持）
warrior 戦士／mage 魔法使い／priest 僧侶／monk 武闘家／thief 盗賊／merchant 商人／hunter 狩人／knight 騎士／sage 賢者（Lv15・魔法使いか僧侶）／magicknight 魔法戦士（Lv15）／waveblade 波形剣士（Lv12・learned_dow）／master 相場の導師（Lv12・learned_risk）。
- 既存の成長率・装備制限・スキル・転職ルール（職業レベルの記録、特技の引き継ぎ、HP/MPの一部引き継ぎ、費用 100G×Lv）はそのまま
- 旧セーブの `jobLevels` は破壊しない。新職業は転職先一覧に「条件未達」として表示されるだけ

## 2. 新8職業

| ID | 名前 | 役割 | 基礎／成長の傾向 | 装備 | 固有スキル（習得Lv） | 解放条件 | 状況 |
|---|---|---|---|---|---|---|---|
| navigator | 航海士 | 航海中の探索・戦闘支援 | HP中・agi高・mag中 | 短剣・弓／軽装・帽子 | 海流読み Lv1（航海中エンカウント率半減・パッシブ）、嵐の舵 Lv4（味方全体の回避上昇）、潮目斬り Lv8（水属性攻撃） | 第4章 ship_ready ＋ Lv5（船乗りから習う） | v5.2 実装（海図の勘 Lv1=scan／嵐の舵 Lv4／潮目斬り Lv8／疾風の加護 Lv13。パッシブ：航海中エンカウント率半減・海流を避けやすい。解放：nagi_joined＋Lv10） |
| auditor | 監査官 | 隠された情報・契約の発見 | HP低・mag高・agi中 | 杖・短剣／ローブ・帽子 | 監査の眼 Lv1（敵の弱点と行動傾向を表示＝scan+expose）、契約破り Lv5（敵の強化解除）、追徴 Lv10（敵の所持金に応じたダメージ） | 第6章 エルナ加入 | v5.1 実装（監査の眼 Lv1=scan+expose／帳簿の裁き Lv5／契約破り Lv9=敵全体の強化解除／弱体 Lv14。解放：elna_joined＋Lv10） |
| artisan | 工匠 | 装備修理・機械の扱い | HP高・atk中・def高 | 斧・棍棒／重装・兜 | 応急修理 Lv1（味方1人の防御低下を解除し防御上昇）、鉄槌 Lv5（機械・ゴーレムに特効）、改造 Lv10（武器攻撃力一時上昇） | 第5章 ヴェルム解放後、工場のガネスから（Lv8） | Phase 7（未着手） |
| surveyor | 測量士 | マップ探索・隠し通路発見 | HP中・agi高 | 弓・短剣／軽装 | 測量 Lv1（ダンジョンで隠し通路・宝箱をミニマップに表示＝パッシブ）、地形読み Lv5（先制率上昇）、測距射撃 Lv8 | 第8章 イーリス加入 | v5.2 実装（地形読み Lv1／測距射撃 Lv5／測量斉射 Lv9／麻痺矢 Lv14。パッシブ：ダンジョンの宝箱がミニマップに見える。解放：iris_joined＋Lv10） |
| chronomancer | 時詠み師 | 行動順・補助魔法 | HP低・mag高 | 杖／ローブ | 未来視 Lv1（味方1人を先行させる）、時の加護 Lv5（味方全体の素早さ上昇）、遅延 Lv10（敵の行動を1ターン遅らせる） | 第10章 時の神殿攻略後 | v5.3 実装（未来視 Lv1=味方1人の素早さ+60%／時の加護 Lv5／遅延 Lv10=敵の素早さ−50%／時間の奔流 Lv16。行動順は素早さで決まるため、先行＝素早さ上昇で実装。解放：sophia_joined＋Lv10） |
| mechanist | 機巧師 | 機械系スキル・特殊攻撃 | HP中・atk中・mag中 | 弓・杖／軽装 | 機巧弾 Lv1（無属性遠距離）、解析 Lv5（scan）、高度な機巧 Lv12（全体雷属性）※高度な機巧は飛空艇復活後に解放 | 第12章 イオ加入 | v5.3 実装（機巧弾 Lv1／解析 Lv5=scan+expose／高度な機巧 Lv12=全体雷／雷撃 Lv16。飛空艇との連動は未実装。解放：io_joined＋Lv10） |
| spirit_warden | 精霊守 | 属性防御・回復・補助 | HP中・mag高・def中 | 杖・槍／ローブ・盾 | 精霊の盾 Lv1（味方1人の属性耐性上昇）、癒しの風 Lv5（全体小回復）、調和 Lv10（状態異常全回復） | アステル加入 | 未着手 |
| oath_knight | 誓約騎士 | 仲間を守る防御特化 | HP高・def高・agi低 | 剣・槍／重装・盾・兜 | 誓約 Lv1（かばう＋反撃）、鉄壁 Lv5（自分の防御大幅上昇）、不退転 Lv10（HP30%以下で防御力2倍・パッシブ） | 第7章 オルド加入 | v5.1 実装（誓約の盾 Lv1／シールドバッシュ Lv6／誓いの壁 Lv10＝全体防御+25%／裁きの剣 Lv15。かばい時の被ダメージ−20%。解放：ord_joined＋Lv10） |

- 成長率は既存職業の `growth` と同じ形式（hp/mp/atk/def/agi/mag）。実装時は既存の warrior〜master の範囲内に収め、上級職（sage 相当）を超えない
- 職業の解放は `unlock: { level, flag }` で既存の `Actors.jobUnlocked` を使う（flag：ship_ready / verum_liberated / elna_joined など）
- ストーリー連動：エルナ加入後に監査官、飛空艇復活後に高度な機巧、神殿攻略後に時詠み師

## 3. トレード関連の装備（ゲーム内の戦闘・探索に作用。現実のトレードの利益を保証する表現はしない）

### 3.1 武器
| ID | 名前 | 種別 | 効果（ゲームロジック） | 入手 | 状況 |
|---|---|---|---|---|---|
| dow_greatsword | ダウの大剣 | sword | 攻撃42。特技「波形斬り」：敵の防御を崩す（exposed 2ターン） | 第5章 ザルグ撃破報酬の宝箱（鉱山3層） | Phase 7（未着手） |
| ema_trident | EMA三重槍 | spear | 攻撃36。通常攻撃が3回ヒット（各0.5倍） | 工場のガネス（工匠加入後、鉱石×3と交換） | Phase 7（未着手） |
| rci_bow | RCI転輪弓 | bow | 攻撃34。命中時に素早さ低下（−25%、2ターン）を付与 | 第8章 | データ |
| macd_twin | MACD双剣 | dagger | 攻撃30。前のターンに攻撃していれば追撃（+1ヒット） | 第13章 | データ |
| hidden_staff | ヒドゥンの魔杖 | staff | 魔力+12。補助魔法を使った次のターン、攻撃魔法1.5倍 | 第12章 | データ |
| stoploss_dagger | 損切りの短剣 | dagger | 攻撃26。防御または逃走成功の次のターン、攻撃力+30% | 第5章 配給所の帳簿係（解放後に販売） | Phase 7（未着手） |

### 3.2 防具
| ID | 名前 | 種別 | 効果 | 入手 | 状況 |
|---|---|---|---|---|---|
| armor_risk | 資金管理の鎧 | heavy | 防御24。最大HPの25%を超えるダメージを30%軽減 | main_5 報酬 | Phase 7（未着手） |
| shield_diversify → shield_risk | リスク分散の盾 | shield | v5.1 実装：防御20。単体攻撃の被ダメージ20%軽減（dmgReduce。設計の「他メンバーへ分散」は未実装、軽減で代替） | main_7 報酬 | v5.1 実装 |
| robe_skip | 見送りの法衣 | robe | 防御12。防御したターンにMPを最大の10%回復 | 第5章 配給所（解放後） | Phase 7（未着手） |
| cloak_volatility | 変動相場のマント | light | 防御16。回避率+15% | 鏡の市場 | 未着手 |
| helm_timeframe | 時間軸の兜 | helm | 防御10。混乱・睡眠・沈黙への耐性 | 時間銀行 | 未着手 |
| armor_patience | 忍耐の鎧 | heavy | 防御22。HP50%以下で防御+40% | 第8章 | データ |

### 3.3 アクセサリー
| ID | 名前 | 効果 | 入手 | 状況 |
|---|---|---|---|---|
| compass_wave | 波形の羅針盤 | ダンジョンで隠し通路・鍵扉の方向をミニマップに表示 | 失敗を禁止された学校 | 未着手 |
| ring_rci | RCIの指輪 | 素早さ+8 | 第5章 鉱山2層の宝箱 | Phase 7（未着手） |
| amulet_macd | MACDの護符 | 魔力+8 | 第13章 | データ |
| scale_rr | リスクリワードの天秤 | 戦闘でHPを失わず勝利すると報酬G+20%、戦闘不能者が出ると−10% | 鏡の市場 | 未着手 |
| charm_stoploss | 損切りのお守り | 致死ダメージをHP1で耐える（戦闘中1回、確率30%） | 第5章 ベルタ（自治会設立の礼） | Phase 7（未着手） |
| glasses_htf | 上位足の眼鏡 | ミニマップの探索範囲+2 | 第8章 イーリス | データ |
| necklace_skip | 見送りの首飾り | 防御コマンドで被ダメージ−50%（通常−50%→−70%） | 記憶を売る町 | 未着手 |
| bracelet_reverse | 反転の腕輪 | 状態異常回復後、攻撃力+20%（2ターン） | 時間銀行 | 未着手 |

### 3.4 重要アイテム（cat: key、売却不可、紛失不可）
| ID | 名前 | 用途 | 状況 |
|---|---|---|---|
| audit_ledger | 古代の監査帳簿 | main_6（証拠） | v5.1 実装（main_6 報酬） |
| lost_sea_chart | 失われた航海図 | main_8（遠洋航海船） | データ |
| crystal_shard | クリスタルの欠片（既存・個数管理） | 第3/10/13章 | 実装済 |
| undersea_record | 海底都市の記録 | main_9 | データ |
| oracle_key | AI中枢の認証鍵 | main_11→12 | データ |
| sky_navigator | 天空の航行装置 | main_14 | データ |
| balance_scale | 均衡の天秤 | main_15→16 | データ |
| final_choice_proof | 最後の選択の証 | エンディング | データ |
| sailcloth / old_compass | 帆布／羅針盤（第4章） | main_4 | 今回 |
| supply_order | 物資の注文書 | verum_supply | 今回 |
| ledger_page | 帳簿の切れ端（カウンター） | verum_ledger | 今回 |
| domin_license | ドミンの採掘証 | gald_reunion | 未着手（v5.0 の報酬は battle_axe） |

重要アイテムは `cat: 'key'`（売却不可）とし、クエスト進行に必要なものはイベントで渡す前に所持チェック、紛失防止のため捨てられない（既存の key カテゴリは捨てられない）。

## 4. 効果の実装先（ロジック）
- `js/rpg/combat.js`：ダメージ計算に装備の `onDamage`（軽減・分散）、`onDefend`（MP回復、次ターン強化）、`hits`（多段）、`onHit`（素早さ低下）、`guardFatal`（お守り）を追加。既存装備と重複しない役割にする
- `js/rpg/actors.js`：`Actors.stats` に装備の passive（agi/mag 加算は既存の `agi`/`mag` 項で対応済み）
- `js/ui/minimap.js`：compass_wave / glasses_htf / 測量士パッシブは探索範囲・隠し表示に反映
- トレード装備（dow_greatsword, ema_trident, stoploss_dagger, armor_risk, robe_skip, ring_rci, charm_stoploss など）とその効果ロジックは Phase 7 で実装する。v5.0（Phase 1〜2）では未着手
