# 装備の外見（ドット絵の差分）の対応表（v9.7〜v9.8.6・自動生成）

appear_pixel_test.js が js/data/equip-pixels.js とゲームの装備（ITEMS）から作る。手で書き換えない。

## 人物ID・向き → 部品

| 人物ID | 向き | 元の絵 | 足もとの基準点 | 握る位置（武器） | 盾の位置 |
|---|---|---|---|---|---|
| hero | job:warrior | assets/characters/jobs/warrior.png | 64, 197 | 22, 117（剣：拳の上に鍔（剣を後に描く）／杖・槍・斧：柄の上に拳を描き直す） | 105, 125（盾：腕の上（体の後に描く）） |
| hero | front | assets/characters/party-directions-v3/sprites/hero/front.png | 160, 304 | 117, 221（剣：拳の上に鍔（剣を後に描く）／杖・槍・斧：柄の上に拳を描き直す） | 200, 229（盾：腕の上（体の後に描く）） |
| hero | back | assets/characters/party-directions-v3/sprites/hero/back.png | 160, 304 | 205, 213（剣：拳の上に鍔／杖・槍・斧：柄の上に拳を描き直す） | 108, 222（盾：左腕の外側（体の後に描く）） |
| lina | menu | assets/characters/companions/lina.png | 97, 271 | 48, 121（杖：柄の上に手を描き直す） | —（盾の部品なし） |
| lina | front | assets/characters/party-directions-v3/sprites/lina/front.png | 160, 304 | 111, 151（杖：柄の上に手を描き直す） | —（盾の部品なし） |
| lina | back | assets/characters/party-directions-v3/sprites/lina/back.png | 160, 304 | 225, 152（杖：柄の上に手を描き直す） | —（盾の部品なし） |
| gald | menu | assets/characters/companions/gald.png | 128, 274 | 37, 137（斧・剣：柄の上に拳を描き直す） | 186, 190（盾：左の拳と前腕の上（体・鎧の後に描く）） |
| gald | front | assets/characters/party-directions-v3/sprites/gald/front.png | 160, 304 | 70, 164（斧・剣：柄の上に拳を描き直す） | 219, 217（盾：左の拳と前腕の上（体・鎧の後に描く）） |
| gald | back | assets/characters/party-directions-v3/sprites/gald/back.png | 160, 304 | 246, 156（斧・剣：柄の上に拳を描き直す） | 72, 212（盾：左腕の外側（体・鎧の後に描く）） |
| kyle | menu | assets/characters/companions/kyle.png | 109, 263 | 35, 160（剣：拳の下に鍔（剣を後に描く）／槍：柄の上に拳を描き直す） | 170, 160（盾：左の拳と前腕の上（体・鎧の後に描く）） |
| kyle | front | assets/characters/party-directions-v3/sprites/kyle/front.png | 160, 304 | 86, 199（剣：拳の下に鍔（剣を後に描く）／槍：柄の上に拳を描き直す） | 221, 199（盾：左の拳と前腕の上（体・鎧の後に描く）） |
| kyle | back | assets/characters/party-directions-v3/sprites/kyle/back.png | 160, 304 | 232, 203（剣：拳の下に鍔／槍：柄の上に拳を描き直す） | 64, 195（盾：左腕の外側（腕の後ろ）） |
| kazuto | menu | assets/characters/companions/kazuto.png | 124, 257 | 56, 146（剣：拳の下に鍔（剣を後に描く）／槍・斧：柄の上に拳を描き直す） | 198, 155（盾：左の拳と前腕の上（体・鎧の後に描く）） |
| kazuto | front | assets/characters/party-directions-add68/sprites/kazuto/front.png | 160, 304 | 96, 192（剣：拳の下に鍔（剣を後に描く）／槍・斧：柄の上に拳を描き直す） | 238, 201（盾：左の拳と前腕の上（体・鎧の後に描く）） |
| kazuto | back | assets/characters/party-directions-add68/sprites/kazuto/back.png | 160, 304 | 251, 181（剣：正面の剣を左右に返して右手（マントの陰）の先に置く／槍・斧：柄の上に拳を描き直す） | 108, 205（盾：左腕の外側（体の後ろの左腕の上）） |
| mina | menu | assets/characters/companions/mina.png | 97, 266 | 160, 170（弓：ミナの左手（画面の右）。握りの上に拳を描き直す／短剣：元の絵の 2 本） | 30, 150（短剣のもう 1 本（右手）。盾の部品なし） |
| mina | front | assets/characters/party-directions-v3/sprites/mina/front.png | 160, 304 | 222, 206（弓：ミナの左手（画面の右）。握りの上に拳を描き直す／短剣：元の絵の 2 本） | 92, 186（短剣のもう 1 本（右手）。盾の部品なし） |
| mina | back | assets/characters/party-directions-v3/sprites/mina/back.png | 160, 304 | 112, 209（弓：ミナの左手（画面の左）。握りの上に拳を描き直す／短剣：元の絵の 2 本） | 228, 208（短剣のもう 1 本（右手）。盾の部品なし） |
| aster | menu | assets/characters/party-directions-v3/sprites/aster/front.png | 160, 318 | 98, 168（武器：柄の上に手を描き直す） | 246, 188（盾：前腕の上） |
| aster | front | assets/characters/party-directions-v3/sprites/aster/front.png | 160, 304 | 98, 168（武器：柄の上に手を描き直す） | 246, 188（盾：前腕の上） |
| aster | back | assets/characters/party-directions-v3/sprites/aster/back.png | 160, 304 | 226, 167（武器：柄の上に手を描き直す） | 90, 180（盾：前腕の上） |
| elna | menu | assets/characters/party-directions-v3/sprites/elna/front.png | 160, 318 | 95, 138（武器：柄の上に手を描き直す） | 170, 154（盾：前腕の上） |
| elna | front | assets/characters/party-directions-v3/sprites/elna/front.png | 160, 304 | 95, 138（武器：柄の上に手を描き直す） | 170, 154（盾：前腕の上） |
| elna | back | assets/characters/party-directions-v3/sprites/elna/back.png | 160, 304 | 225, 138（武器：柄の上に手を描き直す） | 118, 150（盾：前腕の上） |
| ganes | menu | assets/characters/party-directions-v3/sprites/ganes/front.png | 160, 318 | 74, 200（武器：柄の上に手を描き直す） | 236, 200（盾：前腕の上） |
| ganes | front | assets/characters/party-directions-v3/sprites/ganes/front.png | 160, 304 | 74, 200（武器：柄の上に手を描き直す） | 236, 200（盾：前腕の上） |
| ganes | back | assets/characters/party-directions-v3/sprites/ganes/back.png | 160, 304 | 246, 196（武器：柄の上に手を描き直す） | 84, 196（盾：前腕の上） |
| io | menu | assets/characters/party-directions-v3/sprites/io/front.png | 160, 318 | 206, 200（武器：柄の上に手を描き直す） | 88, 215（盾：前腕の上） |
| io | front | assets/characters/party-directions-v3/sprites/io/front.png | 160, 304 | 206, 200（武器：柄の上に手を描き直す） | 88, 215（盾：前腕の上） |
| io | back | assets/characters/party-directions-v3/sprites/io/back.png | 160, 304 | 106, 202（武器：柄の上に手を描き直す） | 270, 238（盾：前腕の上） |
| iris | menu | assets/characters/party-directions-v3/sprites/iris/front.png | 160, 318 | 66, 184（武器：柄の上に手を描き直す） | 228, 214（盾：前腕の上） |
| iris | front | assets/characters/party-directions-v3/sprites/iris/front.png | 160, 304 | 66, 184（武器：柄の上に手を描き直す） | 228, 214（盾：前腕の上） |
| iris | back | assets/characters/party-directions-v3/sprites/iris/back.png | 160, 304 | 231, 222（武器：柄の上に手を描き直す） | 90, 176（盾：前腕の上） |
| lucia | menu | assets/characters/companions/lucia.png | 124, 259 | 190, 138（武器：柄の上に手を描き直す） | 85, 162（盾：前腕の上） |
| lucia | front | assets/characters/party-directions-v3/sprites/lucia/front.png | 160, 304 | 226, 181（武器：柄の上に手を描き直す） | 121, 205（盾：前腕の上） |
| lucia | back | assets/characters/party-directions-v3/sprites/lucia/back.png | 160, 304 | 125, 152（武器：柄の上に手を描き直す） | 222, 200（盾：前腕の上） |
| mochipoyo | menu | assets/characters/companions/mochipoyo.png | 136, 276 | 75, 118（武器：柄の上に手を描き直す） | 152, 112（盾：前腕の上） |
| mochipoyo | front | assets/characters/party-directions-add68/sprites/mochipoyo/front.png | 160, 304 | 97, 144（武器：柄の上に手を描き直す） | 174, 138（盾：前腕の上） |
| mochipoyo | back | assets/characters/party-directions-add68/sprites/mochipoyo/back.png | 160, 304 | 252, 165（武器：柄の上に手を描き直す） | 138, 150（盾：前腕の上） |
| nagi | menu | assets/characters/party-directions-v3/sprites/nagi/front.png | 160, 318 | 102, 156（武器：柄の上に手を描き直す） | 214, 176（盾：前腕の上） |
| nagi | front | assets/characters/party-directions-v3/sprites/nagi/front.png | 160, 304 | 102, 156（武器：柄の上に手を描き直す） | 214, 176（盾：前腕の上） |
| nagi | back | assets/characters/party-directions-v3/sprites/nagi/back.png | 160, 304 | 206, 162（武器：柄の上に手を描き直す） | 108, 178（盾：前腕の上） |
| ord | menu | assets/characters/party-directions-v3/sprites/ord/front.png | 160, 318 | 58, 178（武器：柄の上に手を描き直す） | 210, 190（盾：前腕の上） |
| ord | front | assets/characters/party-directions-v3/sprites/ord/front.png | 160, 304 | 58, 178（武器：柄の上に手を描き直す） | 210, 190（盾：前腕の上） |
| ord | back | assets/characters/party-directions-v3/sprites/ord/back.png | 160, 304 | 238, 186（武器：柄の上に手を描き直す） | 86, 200（盾：前腕の上） |
| seris | menu | assets/characters/companions/seris.png | 106, 278 | 36, 150（武器：柄の上に手を描き直す） | 196, 160（盾：前腕の上） |
| seris | front | assets/characters/party-directions-v3/sprites/seris/front.png | 160, 304 | 90, 174（武器：柄の上に手を描き直す） | 250, 184（盾：前腕の上） |
| seris | back | assets/characters/party-directions-v3/sprites/seris/back.png | 160, 304 | 240, 176（武器：柄の上に手を描き直す） | 76, 196（盾：前腕の上） |
| sophia | menu | assets/characters/party-directions-v3/sprites/sophia/front.png | 160, 318 | 90, 154（武器：柄の上に手を描き直す） | 178, 164（盾：前腕の上） |
| sophia | front | assets/characters/party-directions-v3/sprites/sophia/front.png | 160, 304 | 90, 154（武器：柄の上に手を描き直す） | 178, 164（盾：前腕の上） |
| sophia | back | assets/characters/party-directions-v3/sprites/sophia/back.png | 160, 304 | 214, 179（武器：柄の上に手を描き直す） | 100, 190（盾：前腕の上） |

ほかの人物・向き：部品なし（本人の従来の絵）。

## 部品の種類 → 重ね方

| 種類 | 重ね順（z） | 素の絵（頭にかぶるときに替える） | 部品（tint＝品の色で塗る灰色の層） | 長柄（手を上に描き直す） |
|---|---|---|---|---|
| armor_light（（全員）） | 10 | —（変えない） | armor_shape_f、armor_light_t（tint:main） |  |
| armor_heavy（（全員）） | 10 | —（変えない） | armor_shape_f、armor_heavy_t（tint:main・灰色の品は塗らない） |  |
| armor_robe（（全員）） | 10 | —（変えない） | armor_robe_x（消す）、armor_robe_t（tint:main）、armor_robe_f |  |
| head_helm（（全員）） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（（全員）） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| shield（（全員）） | 30 | —（変えない） | shield |  |
| weapon_sword（（全員）） | 40 | —（変えない） | weapon_sword |  |
| weapon_staff（（全員）） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| weapon_spear（（全員）） | 40 | —（変えない） | weapon_spear | はい |
| weapon_axe（（全員）） | 40 | —（変えない） | weapon_axe | はい |
| head_cap（（全員）） | 20 | —（変えない） | head_cap_t（tint:main） |  |
| weapon_bow（（全員）） | 40 | —（変えない） | weapon_bow | はい |
| weapon_dagger（（全員）） | 40 | —（変えない） | weapon_dagger |  |
| weapon_dagger（hero） | 40 | —（変えない） | weapon_dagger | はい |
| armor_robe（hero） | 10 | —（変えない） | armor_robe_x（消す）、armor_robe_t（tint:main）、armor_robe_f |  |
| head_cap（hero） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（hero） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| armor_light（lina） | 10 | —（変えない） | armor_light_t（tint:main） |  |
| head_helm（lina） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（lina） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_circlet（lina） | 21 | base_nohat | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（lina） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（lina） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_light（gald） | 10 | —（変えない） | armor_light_t（tint:main） |  |
| weapon_sword（gald） | 40 | —（変えない） | weapon_sword | はい |
| shield（gald） | 30 | —（変えない） | shield_t（tint:main・灰色の品は元の鎧の色）、shield_f |  |
| head_helm（gald） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（gald） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（gald） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（gald） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| armor_robe（gald） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| shield（kyle） | 30 | —（変えない） | shield_f、shield_t（tint:main・灰色の品は塗らない）、shield_e |  |
| head_hat（kyle） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（kyle） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（kyle） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| armor_robe（kyle） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| shield（kazuto） | 30 | —（変えない） | shield_f、shield_t（tint:main・灰色の品は塗らない）、shield_e |  |
| head_hat（kazuto） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（kazuto） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（kazuto） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| armor_robe（kazuto） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| weapon_sword（mina） | 40 | —（変えない） | weapon_sword | はい |
| head_helm（mina） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（mina） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（mina） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（mina） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（mina） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（mina） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（mina） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（mina） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（aster） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（aster） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（aster） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（aster） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（aster） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（aster） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（aster） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（aster） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（aster） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（aster） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（aster） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（aster） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（aster） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（aster） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（elna） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（elna） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（elna） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（elna） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（elna） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（elna） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（elna） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（elna） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（elna） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（elna） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（elna） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（elna） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（elna） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（elna） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（ganes） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（ganes） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（ganes） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（ganes） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（ganes） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（ganes） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（ganes） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（ganes） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（ganes） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（ganes） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（ganes） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（ganes） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（ganes） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（ganes） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（io） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（io） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（io） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（io） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（io） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（io） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（io） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（io） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（io） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（io） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（io） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（io） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（io） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（io） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（iris） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（iris） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（iris） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（iris） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（iris） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（iris） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（iris） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（iris） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（iris） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（iris） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（iris） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（iris） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（iris） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（iris） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（lucia） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（lucia） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（lucia） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（lucia） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（lucia） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（lucia） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（lucia） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（lucia） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（lucia） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（lucia） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（lucia） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（lucia） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（lucia） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（lucia） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（mochipoyo） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（mochipoyo） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（mochipoyo） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（mochipoyo） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（mochipoyo） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（mochipoyo） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（mochipoyo） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（mochipoyo） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（mochipoyo） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（mochipoyo） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（mochipoyo） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（mochipoyo） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（mochipoyo） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（mochipoyo） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（nagi） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（nagi） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（nagi） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（nagi） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（nagi） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（nagi） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（nagi） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（nagi） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（nagi） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（nagi） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（nagi） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（nagi） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（nagi） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（nagi） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（ord） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（ord） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（ord） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（ord） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（ord） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（ord） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（ord） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（ord） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（ord） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（ord） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（ord） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（ord） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（ord） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（ord） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（seris） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（seris） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（seris） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（seris） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（seris） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（seris） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（seris） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（seris） | 20 | —（変えない） | own_hat_t（tint:main） |  |
| head_cap（seris） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（seris） | 21 | base_nohat | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（seris） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（seris） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（seris） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（seris） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |
| weapon_sword（sophia） | 40 | —（変えない） | weapon_sword | はい |
| weapon_dagger（sophia） | 40 | —（変えない） | weapon_dagger | はい |
| weapon_axe（sophia） | 40 | —（変えない） | weapon_axe | はい |
| weapon_spear（sophia） | 40 | —（変えない） | weapon_spear | はい |
| weapon_bow（sophia） | 40 | —（変えない） | weapon_bow | はい |
| weapon_staff（sophia） | 40 | —（変えない） | weapon_staff_t（tint:orb）、weapon_staff_f | はい |
| head_helm（sophia） | 20 | base_helm | head_helm_t（tint:main・灰色の品は元の鎧の色）、head_helm_f |  |
| head_hat（sophia） | 20 | base_hat | head_hat_t（tint:main）、head_hat_f |  |
| head_cap（sophia） | 20 | base_cap | head_cap_t（tint:main）、head_cap_f |  |
| head_circlet（sophia） | 21 | —（変えない） | head_circlet_t（tint:main）、head_circlet_f |  |
| shield（sophia） | 30 | —（変えない） | shield_gt（tint:main・灰色の品は元の鎧の色）、shield_gf |  |
| armor_heavy（sophia） | 10 | —（変えない） | jf_cloth_t（tint:main・灰色の品は元の鎧の色）、hv_pl_t（tint:main・灰色の品は元の鎧の色）、hv_pl_f |  |
| armor_robe（sophia） | 10 | —（変えない） | jf_x（消す）、jf_capehem_f、jf_cloth_t（tint:main）、jf_skirt_t（tint:main）、jf_skirt_f |  |
| armor_light（sophia） | 10 | —（変えない） | jf_cloth_t（tint:main） |  |

## 装備ID → 部品の種類

| 枠 | 形（type/sub） | 部品の種類 | 品の数 | 装備ID |
|---|---|---|---|---|
| acc | acc/amulet | （描かない） | 11 | amulet_life, amulet_mind, antidote_charm, time_amulet, amulet_macd, charm_stoploss, wave_charm, lln_charm, streak_charm, reversal_warning, td_margin_charm |
| acc | acc/anklet | （描かない） | 1 | nonslip_charm |
| acc | acc/bell | （描かない） | 2 | market_bell, b19_silent_bell |
| acc | acc/bracelet | （描かない） | 4 | bracelet_reverse, ev_bracelet, allocation_bangle, bu_desire_seal_bracer |
| acc | acc/brooch | （描かない） | 8 | auditor_seal, academy_crest, breakeven_crest, thinice_brooch, b19_balance_star, b19_all_seal, earth_globe, bu_hald_audit_badge |
| acc | acc/chain | （描かない） | 1 | oath_chain |
| acc | acc/circlet | （描かない） | 1 | iron_crown |
| acc | acc/compass | （描かない） | 5 | compass_wave, navigator_compass, star_compass, astral_lodestone, bu_trend_compass |
| acc | acc/earring | （描かない） | 2 | vol_earring, surf_earring |
| acc | acc/filter | （描かない） | 1 | clean_filter |
| acc | acc/gear | （描かない） | 1 | io_core |
| acc | acc/glasses | （描かない） | 4 | glasses_htf, observer_lens, td_divergence_lens, bu_observer_lens |
| acc | acc/lantern | （描かない） | 2 | bu_soul_warden_lamp, bu_fear_seal_lantern |
| acc | acc/necklace | （描かない） | 3 | necklace_skip, target_pendant, memory_drop |
| acc | acc/piece | （描かない） | 1 | b19_check_piece |
| acc | acc/ring | （描かない） | 13 | ring_power, ring_guard, ring_speed, ring_rci, surveyor_ring, lucky_ring, scalein_ring, stoporder_ring, pivot_ring, explorer_ring, star_ring, bu_ledger_core_ring, bu_entangled_ring |
| acc | acc/scale | （描かない） | 1 | scale_rr |
| acc | acc/scroll | （描かない） | 1 | td_stoploss_pledge |
| acc | acc/shard | （描かない） | 3 | dragon_heart, candle_stone, reactor_shard |
| acc | acc/watch | （描かない） | 3 | td_session_watch, conductor_watch, bu_time_guardian_watch |
| armor | heavy/chain | armor_heavy | 1 | chain_mail |
| armor | heavy/cuirass | armor_heavy | 1 | ashiron_plate |
| armor | heavy/plate | armor_heavy | 25 | iron_armor, knight_armor, rune_mail, armor_risk, armor_patience, oath_mail, legend_gambler_armor, copperwall_armor, prob_armor, federal_plate, deepsea_armor, final_plate, b19_bronze_desire_mail, t68_islands_heavy, t68_tempus_heavy, t68_desert_heavy, t68_machine_heavy, t68_snow_heavy, t68_dragon_heavy, t68_dark_heavy, spacetime_armor, coral_mail, bu_greed_crystal_mail, bu_core_barrier_mail, bu_archive_backup_mail |
| armor | heavy/scale | armor_heavy | 2 | dragon_mail, bu_magma_warden_mail |
| armor | light/cloak | armor_light | 8 | star_cloak, cloak_volatility, dune_cloak, gambler_cloak, sandstorm_cloak, b19_bare_face_cloak, neon_raincoat, bu_742_memory_cloak |
| armor | light/cloth | armor_light | 3 | cloth, trader_coat, auditor_coat |
| armor | light/coat | armor_light | 3 | sea_coat, fur_coat, ashshore_coat |
| armor | light/leather | armor_light | 11 | leather_armor, scale_armor, surf_armor, seabreeze_leather, stardrift_mail, t68_islands_light, t68_tempus_light, t68_desert_light, t68_machine_light, t68_snow_light, t68_dark_light |
| armor | light/ninja | armor_light | 1 | ninja_garb |
| armor | robe/robe | armor_robe | 23 | robe, silk_robe, sage_robe, temporal_robe, sky_robe, robe_skip, ember_robe, healer_robe, statistician_robe, antiretro_vestment, iceport_robe, chrono_formal, voidward_robe, td_risk_robe, b19_dark_matter_veil, t68_islands_robe, t68_desert_robe, t68_machine_robe, t68_snow_robe, t68_dragon_robe, t68_dark_robe, bu_frost_spirit_robe, bu_sevran_blank_robe |
| armor | robe/veil | armor_robe | 3 | mirage_veil, b19_porcelain_robe, aeria_robe |
| head | hat/bicorne | head_cap | 1 | bu_gull_admiral_hat |
| head | hat/cap | head_cap | 9 | leather_cap, hilo_hat, desert_star_hat, t68_islands_hat, t68_tempus_hat, t68_desert_hat, t68_machine_hat, t68_dragon_hat, t68_dark_hat |
| head | hat/circlet | head_circlet | 1 | bu_control_seal_circlet |
| head | hat/crown | head_circlet | 1 | bu_memory_keeper_helm |
| head | hat/feather | head_cap | 1 | feather_hat |
| head | hat/hood | head_cap | 1 | icecrystal_hood |
| head | hat/turban | head_cap | 1 | sand_turban |
| head | hat/witch | head_hat | 3 | wizard_hat, arcane_hat, td_rci_hat |
| head | helm/crown | head_helm | 2 | mentor_crown, td_dow_crown |
| head | helm/dragon | head_helm | 2 | dragon_helm, t68_dragon_helm |
| head | helm/helm | head_helm | 15 | iron_helm, knight_helm, star_helm, helm_timeframe, smoked_helm, seachart_helm, math_helm, b19_rate_gauge_helm, t68_islands_helm, t68_desert_helm, t68_machine_helm, t68_snow_helm, t68_dark_helm, bu_anchor_gravity_helm, bu_mine_captain_helm |
| shield | shield/barrier | shield | 1 | mana_barrier_shield |
| shield | shield/buckler | shield | 1 | dow_buckler |
| shield | shield/heater | shield | 17 | iron_shield, knight_shield, stoploss_shield, aegis_shield, shield_risk, golden_shield, pullback_shield, doom_guard_shield, t68_islands_shield, t68_tempus_shield, t68_desert_shield, t68_machine_shield, t68_snow_shield, t68_dragon_shield, t68_dark_shield, orbit_shield, bu_ledger_shield |
| shield | shield/round | shield | 4 | wooden_shield, td_mirror_buckler, ancient_shield, bu_signal_shield |
| shield | shield/tower | shield | 4 | ironcastle_shield, b19_unsmiling_aegis, bu_dorek_bastion, bu_fear_break_shield |
| weapon | axe/axe | weapon_axe | 5 | sky_axe, dragon_axe, momentum_axe, chainbreak_axe, b19_expected_value_axe |
| weapon | axe/battleaxe | weapon_axe | 6 | battle_axe, crater_axe, crash_axe, t68_dark_axe, bu_garon_axe, bu_zarg_chainbreaker |
| weapon | axe/handaxe | weapon_axe | 1 | hand_axe |
| weapon | bow/bow | weapon_bow | 15 | hunter_bow, survey_bow, star_bow, caravan_bow, zero_bow, breakconfirm_bow, range_bow, prob_hunt_bow, t68_islands_bow, t68_tempus_bow, t68_desert_bow, t68_snow_bow, t68_dark_bow, orbit_bow, bu_zaid_sand_bow |
| weapon | bow/longbow | weapon_bow | 4 | long_bow, azure_longbow, td_swing_longbow, b19_amber_memory_bow |
| weapon | bow/mechbow | weapon_bow | 6 | gear_bow, rci_bow, rci_bow_2, t68_machine_bow, bu_drone_link_bow, bu_orbis_orbit_bow |
| weapon | bow/shortbow | weapon_bow | 1 | short_bow |
| weapon | claw/claw | （なし→その部位を描かない） | 14 | leather_claw, iron_claw, tiger_claw, shadow_claw, flame_claw, retro_claw, thunder_claw, losscut_claw, b19_sober_claw, t68_tempus_claw, t68_snow_claw, t68_dragon_claw, t68_dark_claw, bu_wolf_king_claw |
| weapon | claw/gauntlet | （なし→その部位を描かない） | 2 | bu_zarg_remnant_claw, bu_greed_limit_gauntlet |
| weapon | claw/twinclaw | （なし→その部位を描かない） | 1 | obsidian_twin |
| weapon | club/club | （なし→その部位を描かない） | 1 | club |
| weapon | club/hammer | （なし→その部位を描かない） | 9 | balance_mace, ash_hammer, candle_hammer, margin_hammer, scale_mace, t68_islands_club, t68_desert_club, t68_dragon_club, t68_dark_club |
| weapon | club/kine | （なし→その部位を描かない） | 1 | b19_golden_kine |
| weapon | club/mace | （なし→その部位を描かない） | 1 | holy_mace |
| weapon | club/rod | （なし→その部位を描かない） | 2 | iron_club, basis_rod |
| weapon | dagger/dagger | weapon_dagger | 15 | dagger, assassin_dagger, tide_dagger, void_dagger, stoploss_dagger, stoploss_dagger_2, pinbar_dagger, breakout_dagger, contrarian_blade, b19_present_jewel_blade, b19_two_faced_dagger, t68_islands_dagger, t68_tempus_dagger, t68_machine_dagger, t68_dark_dagger |
| weapon | dagger/knife | weapon_dagger | 3 | bronze_dagger, silent_knife, td_scalper_knife |
| weapon | dagger/twin | weapon_dagger | 2 | macd_twin, macd_twin_2 |
| weapon | spear/banner | weapon_spear | 1 | guide_flag_spear |
| weapon | spear/clockhand | weapon_spear | 1 | clock_hand_spear |
| weapon | spear/halberd | weapon_spear | 2 | halberd, td_breakout_halberd |
| weapon | spear/spear | weapon_spear | 18 | spear, iron_spear, astral_spear, ema_trident, ema_trident_2, sun_spear, pullback_spear, ryumyaku_spear, star_cycle_spear, b19_hold_fast_lance, t68_islands_spear, t68_tempus_spear, t68_desert_spear, t68_machine_spear, t68_snow_spear, t68_dark_spear, bu_urga_spear, bu_sky_guardian_spear |
| weapon | spear/trident | weapon_spear | 2 | takeprofit_trident, bu_tides_coral_trident |
| weapon | spear/umbrella | weapon_spear | 1 | neon_umbrella |
| weapon | staff/book | weapon_staff | 2 | bu_library_archive_staff, bu_volk_forbidden_staff |
| weapon | staff/crystal | weapon_staff | 2 | ice_staff, bu_crystal_resonance_staff |
| weapon | staff/key | weapon_staff | 1 | tidegate_staff |
| weapon | staff/staff | weapon_staff | 21 | mage_staff, sage_staff, chrono_staff, arcane_staff, hidden_staff, hidden_staff_2, ev_staff, compound_staff, stats_staff, oracle_staff, spacetime_staff, td_ema_staff, t68_islands_staff, t68_tempus_staff, t68_desert_staff, t68_machine_staff, t68_snow_staff, t68_dragon_staff, t68_dark_staff, starseer_staff, bu_zero_echo_staff |
| weapon | staff/tablet | weapon_staff | 1 | b19_ember_tablet_staff |
| weapon | staff/wood | weapon_staff | 1 | oak_staff |
| weapon | sword/forked | weapon_sword | 1 | b19_crossroads_blade |
| weapon | sword/greatsword | weapon_sword | 3 | dow_greatsword, dow_greatsword_2, bu_valen_oathblade |
| weapon | sword/saber | weapon_sword | 2 | scimitar, captain_saber |
| weapon | sword/sword | weapon_sword | 24 | copper_sword, iron_sword, steel_sword, knight_sword, wave_sword, rune_blade, ryumyaku_blade, prob_sword, fate_blade, yang_sword, yin_sword, resistance_blade, equilibrium_sword, td_zeno_blade, b19_seal_justice_sword, t68_islands_sword, t68_tempus_sword, t68_desert_sword, t68_machine_sword, t68_dragon_sword, t68_dark_sword, archeion_blade, azure_sword, bu_open_future_blade |
| weapon | sword/wood | weapon_sword | 1 | wooden_sword |

## 人物ごとに描ける種類（その人の部品がある種類。ない種類の品は、その部位だけ描かない）

| 人物ID | 描ける種類 |
|---|---|
| hero | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| lina | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| gald | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| kyle | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| kazuto | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| mina | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| aster | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| elna | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| ganes | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| io | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| iris | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| lucia | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| mochipoyo | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| nagi | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| ord | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| seris | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
| sophia | armor_light、armor_heavy、armor_robe、head_helm、head_hat、head_cap、head_circlet、weapon_sword、weapon_staff、weapon_spear、weapon_axe、weapon_bow、weapon_dagger、shield |
