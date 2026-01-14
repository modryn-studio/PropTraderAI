/**
 * TEMPLATE STRATEGY SYSTEM TESTS
 * 
 * Tests the beginner template system for handling vague/frustrated users.
 */

import { 
  handleBeginnerResponse,
  getTemplate,
  getDefaultTemplate,
  templateToRules,
  BEGINNER_TEMPLATES
} from '../templates';

// ============================================================================
// TEMPLATE SYSTEM TESTS
// ============================================================================

console.log('=== TEMPLATE SYSTEM TESTS ===\n');

// Test 1: All templates exist
console.log('Test 1: Template count');
console.log(`  Templates available: ${BEGINNER_TEMPLATES.length} (expected: 4+)`);
console.log(`  ✓ ${BEGINNER_TEMPLATES.length >= 4 ? 'PASS' : 'FAIL'}\n`);

// Test 2: Get template by ID
const orbTemplate = getTemplate('basic_orb');
console.log('Test 2: Get template by ID');
console.log(`  Got template: ${orbTemplate?.name} (expected: Opening Range Breakout)`);
console.log(`  ✓ ${orbTemplate?.name === 'Opening Range Breakout' ? 'PASS' : 'FAIL'}\n`);

// Test 3: Default template is most popular
const defaultTemplate = getDefaultTemplate();
console.log('Test 3: Default template');
console.log(`  Default: ${defaultTemplate.name} (expected: most popular)`);
console.log(`  Popularity: ${defaultTemplate.popularity} (expected: highest)`);
const highestPop = Math.max(...BEGINNER_TEMPLATES.map(t => t.popularity));
console.log(`  ✓ ${defaultTemplate.popularity === highestPop ? 'PASS' : 'FAIL'}\n`);

// Test 4: Template to rules conversion
const rules = templateToRules(orbTemplate!);
console.log('Test 4: Template to rules');
console.log(`  Rules count: ${rules.length} (expected: 7+)`);
console.log(`  All defaulted: ${rules.every(r => r.isDefaulted)} (expected: true)`);
console.log(`  ✓ ${rules.length >= 7 && rules.every(r => r.isDefaulted) ? 'PASS' : 'FAIL'}\n`);

// ============================================================================
// BEGINNER RESPONSE HANDLING TESTS
// ============================================================================

console.log('=== BEGINNER RESPONSE TESTS ===\n');

// Test 5: Valid option response
const validResponse = handleBeginnerResponse('a', ['breakout', 'pullback', 'orb']);
console.log('Test 5: Valid option "a"');
console.log(`  Type: ${validResponse.type} (expected: proceed_normal)`);
console.log(`  ✓ ${validResponse.type === 'proceed_normal' ? 'PASS' : 'FAIL'}\n`);

// Test 6: Valid option word
const validResponse2 = handleBeginnerResponse('breakout', ['breakout', 'pullback', 'orb']);
console.log('Test 6: Valid option word');
console.log(`  Type: ${validResponse2.type} (expected: proceed_normal)`);
console.log(`  ✓ ${validResponse2.type === 'proceed_normal' ? 'PASS' : 'FAIL'}\n`);

// Test 7: Frustrated response - "I just want to make money"
const frustratedResponse = handleBeginnerResponse('I just want to make money', ['breakout', 'pullback']);
console.log('Test 7: Frustrated response');
console.log(`  Type: ${frustratedResponse.type} (expected: offer_template)`);
console.log(`  Template ID: ${frustratedResponse.templateId} (expected: basic_orb)`);
console.log(`  ✓ ${frustratedResponse.type === 'offer_template' && frustratedResponse.templateId === 'basic_orb' ? 'PASS' : 'FAIL'}\n`);

// Test 8: Frustrated response - "whatever"
const whateverResponse = handleBeginnerResponse('whatever', ['breakout', 'pullback']);
console.log('Test 8: "whatever" response');
console.log(`  Type: ${whateverResponse.type} (expected: offer_template)`);
console.log(`  ✓ ${whateverResponse.type === 'offer_template' ? 'PASS' : 'FAIL'}\n`);

// Test 9: Confused response - unrelated answer
const confusedResponse = handleBeginnerResponse('I like the color blue', ['breakout', 'pullback']);
console.log('Test 9: Confused response');
console.log(`  Type: ${confusedResponse.type} (expected: simplify_options)`);
console.log(`  ✓ ${confusedResponse.type === 'simplify_options' ? 'PASS' : 'FAIL'}\n`);

// Test 10: "idk" response
const idkResponse = handleBeginnerResponse("idk", ['breakout', 'pullback']);
console.log('Test 10: "idk" response');
console.log(`  Type: ${idkResponse.type} (expected: offer_template)`);
console.log(`  ✓ ${idkResponse.type === 'offer_template' ? 'PASS' : 'FAIL'}\n`);

// Test 11: "you decide" response
const youDecideResponse = handleBeginnerResponse("you decide for me", ['breakout', 'pullback']);
console.log('Test 11: "you decide" response');
console.log(`  Type: ${youDecideResponse.type} (expected: offer_template)`);
console.log(`  ✓ ${youDecideResponse.type === 'offer_template' ? 'PASS' : 'FAIL'}\n`);

console.log('=== ALL TESTS COMPLETE ===');
