// ==UserScript==
// @name         RSHB MCC View
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Show MCC in RSHB online bank
// @author       alezhu
// @match        https://online.rshb.ru/ib6/wf2/retail/cards/newbankcardpanel
// @grant        none
// @source      https://github.com/alezhu/rshb_online_mcc/raw/master/rshb_mcc_view.user.js
// @updateURL   https://github.com/alezhu/rshb_online_mcc/raw/master/rshb_mcc_view.user.js
// @downloadURL https://github.com/alezhu/rshb_online_mcc/raw/master/rshb_mcc_view.user.js

// ==/UserScript==

(function(Tapestry) {
    'use strict';
    var operationMap = new Map();

    var zone = Tapestry.findZoneManagerForZone("chartZone");
    var origProcessReply = zone.processReply.bind(zone);
    zone.processReply = function(replay) {
        operationMap.clear();
        if (replay.inits) {
            for (var i = 0; i < replay.inits.length; i++) {
                var init = replay.inits[i];
                if (init.initCardExpensesChart) {
                    for (var j = 0; j < init.initCardExpensesChart.length; j++) {
                        var chart = init.initCardExpensesChart[j];
                        if (chart.operations) {
                            for (var o = 0; o < chart.operations.length; o++) {
                                var operation = chart.operations[o];
                                if (operation.mcc) {

                                    var oMapDate = operationMap.get(operation.date);
                                    if (!oMapDate) {
                                        oMapDate = new Map();
                                        operationMap.set(operation.date, oMapDate);
                                    }

                                    var oMapTSP = oMapDate.get(operation.desc);
                                    if (!oMapTSP) {
                                        oMapTSP = new Map();
                                        oMapDate.set(operation.desc, oMapTSP);
                                    }

                                    oMapTSP.set(operation.amount, operation.mcc)

                                }
                            }
                        }
                    }
                }
            }
        }
        origProcessReply(replay);
    };

    Event.on(zone.element, Tapestry.ZONE_UPDATED_EVENT, function(event, element) {
        try {
            var oTabOperation = element.select('.retail-operations')[0];
            var aTr = oTabOperation.select("tr");
            aTr.each(function(oTr, index) {
                if (oTr.hasClassName('table-header')) return;
                var date = null;
                var amount = null;
                var oText = null;
                var sTSP = null;
                var aTd = oTr.select("td");
                aTd.each(function(oTd, index) {
                    switch (index) {
                        case 0:
                            //Date
                            var aMatch = oTd.innerText.match(/(\S+)\s/);
                            if (aMatch && aMatch.length == 2) date = aMatch[1];

                            break;
                        case 1:
                            //Text
                            oText = oTd;
                            break;
                        case 5:
                            //Amount
                            amount = Math.abs(Number.parseFloat(oTd.innerText.replace(/\s+/g, '')));
                            break;
                        case 6:
                            //TSP
                            sTSP = oTd.innerText;
                            break;
                    }
                });
                if (date && amount && oText && sTSP) {
                    var oMapDate = operationMap.get(date);
                    if (oMapDate) {
                        var oMapTSP = oMapDate.get(sTSP);
                        if (oMapTSP) {
                            var mcc = oMapTSP.get(amount);
                            if (mcc) {
                                oText.innerHTML = oText.innerText + "&nbsp;MCC:&nbsp;" + mcc;
                            }
                        }
                    }
                }
            });
        } catch (e) {}
    });


})(Tapestry);