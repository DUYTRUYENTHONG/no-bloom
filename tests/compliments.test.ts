import assert from "node:assert/strict";
import {test} from "node:test";
import {compliments,complimentIds,chooseCompliment} from "../lib/compliments";
import {createGiftLink,readGiftLink} from "../lib/gift-link";
import {createBotanicalResponse} from "../lib/botanical-ui";
import {generativeUiResponseSchema} from "../lib/botanical-schema";

test('compliment variants are distinct, bilingual and never immediately repeat',()=>{
  assert.equal(new Set(complimentIds.map(id=>compliments[id].vi.body)).size,complimentIds.length);
  assert.equal(new Set(complimentIds.map(id=>compliments[id].en.body)).size,complimentIds.length);
  for(const previous of complimentIds)for(const random of [0,.25,.5,.99,1])assert.notEqual(chooseCompliment(previous,random),previous);
  for(const id of complimentIds)for(const locale of ['vi','en'] as const){
    const payload=createBotanicalResponse('FULL_BLOOM',locale,'<b>Mai</b>','rose',id);
    assert.equal(payload.componentSpec.props.data.compliment.id,id);
    assert.equal(payload.componentSpec.props.data.recipient,'<b>Mai</b>');
    assert.equal(generativeUiResponseSchema.safeParse(payload).success,true);
  }
});

test('personal links preserve an allowlisted greeting variant and discard invalid values',()=>{
  const url=new URL(createGiftLink(new URL('https://example.com/no-bloom/?private=discard'),'Mai','peony','care'));
  assert.equal(url.searchParams.get('private'),null);
  assert.deepEqual(readGiftLink(url),{name:'Mai',flower:'peony',complimentId:'care'});
  url.searchParams.set('wish','<script>ignored</script>');
  assert.deepEqual(readGiftLink(url),{name:'Mai',flower:'peony'});
});
