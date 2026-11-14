// Source inspection only. Never imports user config/device state or connects to Gateway.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runInNewContext } from 'node:vm';
import { ABORT_TRIGGERS, admitText, SUPPORTED_OPENCLAW } from './input-policy.mjs';
const packagePath=process.env.PCC_REM_TEST_OPENCLAW_PACKAGE;
test('pinned installed abort and inline/alias parser compatibility (explicit package required)',{skip:!packagePath},async()=>{
  assert.equal(JSON.parse(await readFile(packagePath,'utf8')).version,SUPPORTED_OPENCLAW);
  const dist=join(dirname(packagePath),'dist');const files=await readdir(dist);
  const abortFile=files.find(f=>/^abort-trigger-text-.*\.mjs$/.test(f));const source=await readFile(join(dist,abortFile),'utf8');
  const literal=source.match(/new Set\(\[([\s\S]*?)\]\)/)[1];const installed=new Set(JSON.parse(`[${literal}]`));
  assert.deepEqual([...ABORT_TRIGGERS].sort(),[...installed].sort());
  const abortModule=await import(pathToFileURL(join(dist,abortFile)).href);
  for(const trigger of installed){for(const input of [trigger,trigger.toUpperCase()+'...',`  ${trigger.replaceAll(' ','  ')}?!`]){assert.equal(abortModule.t(input),true);assert.equal(admitText(input),false);}}
  const reply=files.find(f=>/^get-reply-.*\.mjs$/.test(f));const replySource=await readFile(join(dist,reply),'utf8');
  const modelConstants=replySource.slice(replySource.indexOf('const QUOTED_ATOM_PATTERN ='),replySource.indexOf('const MODEL_SCOPE_OPTIONS ='));
  const regex=runInNewContext(`${modelConstants}\nMODEL_DIRECTIVE_PATTERN;`,{}, {timeout:1000});
  for(const text of ['Please answer /model example/model','/model: example/model','before\n/model example/model']){assert.equal(regex.test(text),true);assert.equal(admitText(text),false);}
  for(const text of ['See https://example.test/model','https://example.test/path?x=/model']){assert.equal(regex.test(text),false);assert.equal(admitText(text),true);}
  assert.match(replySource,/aliases\.map\(escapeRegExp\)/);
  for(const text of ['/configured-alias','hello /configured-alias'])assert.equal(admitText(text),false);
});
