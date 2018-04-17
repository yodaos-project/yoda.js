'use strict';

var fs = require('fs');
var triggerWord = require('/data/system/device.json').triggerWord;
if (triggerWord) {
  var text = [
    'type=1',
    'content=' + triggerWord.text,
    'block.frm.min=3',
    'block.frm.max=30',
    'block.score.avg=4.2f',
    'block.score.min=2.7f',
    'sil.left.check=1',
    'sil.left.offset=35',
    'sil.left.skip=10',
    'sil.left.shield=0.5',
    'sil.right.check=0',
    'classify.check=0',
    'classify.shield=-0.04',
    'pholst=' + triggerWord.pinyin.replace(/\d/ig, ' '),
  ].join('\n');
  fs.writeFileSync('/system/workdir_asr_cn/word.custom.cfg', text, 'utf8');
}