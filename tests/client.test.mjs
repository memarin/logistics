import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isCurrentVersion,guideStepComplete} from '../domain/client-state.mjs';
import {fixture} from './fixtures.mjs';
test('C01 delayed browser responses cannot replace newer state',()=>{assert.equal(isCurrentVersion(8,7),false);assert.equal(isCurrentVersion(8,9),true);assert.equal(isCurrentVersion(8,8),true);assert.equal(isCurrentVersion(8,undefined),false);});
test('C02 guide can continue when another reviewer released the order',()=>{const s=fixture();s.orders[0].status='released';assert.equal(guideStepComplete(s,2),true);assert.equal(guideStepComplete(s,6),true);assert.equal(guideStepComplete(s,7),false);});
test('C03 guide can continue after another reviewer corrected the shortage',()=>{const s=fixture();s.inventory[1].onHand=6;assert.equal(guideStepComplete(s,7),true);assert.equal(guideStepComplete(s,8),true);assert.equal(guideStepComplete(s,10),false);});
