# 家長請假補充說明必填

2026-11-24 已更新正式官網61版，原版59保留作回復點。

- 請假表單標記「補充說明 必填」，加入粗體「請說明便於分校能協助後續課程進度安排。」
- 新增與修改共用空白檢查。空字串、空格與全形空白無法進入確認畫面。輸入的說明會去除首尾空白。
- 7項測試通過。正式56資產及MIME逐檔核對通過，只有leave/index.html與leave/parent-center.js改動，其餘54檔雜湊一致。
- 瀏覽器讀回required、aria-required與strong文字正確。家長LINE登入後實際申請送出尚未實測。
- 本次為表單端必填限制，Gateway API原驗證仍沿用現行規則。原始歷史紀錄與既有未完成請求的同一requestId重試保留。
- 接孩子通知的pickupNote仍選填。本輪沒有送出請假或通知，沒有修改GAS、同步、LINE或排程。

## 重現與證據

執行 node --test dev/leave-reason-required-20261124/patch.test.mjs。index.html與parent-center.js為公開59版基準fixture，patch.mjs產出指定兩檔差異。公開去敏回執見receipt.json。

私人發布檔與完整56資產封存於.private/，不進Git。原始完整manifest來自10/20正式59發布回執，版本ID與本輪正式基準相同，逐檔保存內容與發布來源雜湊相符。新增未啟用60版因資產路由讀回不符停止，未承接流量。改用原純靜態完整56資產流程發布61，保留原0綁定、0排程及runtime。

需要回復時，先確認正式61沒有後續漂移，再將原59版重新承接流量，保留所有業務資料。回復未實際執行。

[正式家長請假中心](https://taipingxinguang.org/leave/)
