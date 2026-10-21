import test from 'node:test';
import assert from 'node:assert/strict';
import { countdownTo, koreaDateParts, calendarCells, createCalendarEvent, weddingJourney } from '../date-utils.js';
import { createRunnerState, obstaclesBetween, stepRunner, runnerSpeed, requestJump, RUN_SPEED } from '../runner-model.js';
import { wedding } from '../wedding-config.js';

test('wedding time is 11 AM Korea, independent of visitor timezone',()=>{
  assert.equal(new Date(wedding.date).toISOString(),'2027-06-12T02:00:00.000Z');
  assert.deepEqual(koreaDateParts(wedding.date),{year:2027,month:6,day:12});
  assert.deepEqual(countdownTo(wedding.date,Date.parse('2027-06-11T00:59:59Z')),{days:1,hours:1,minutes:0,seconds:1,arrived:false});
});
test('countdown stops at zero at and after the wedding',()=>{
  for(const now of ['2027-06-12T02:00:00Z','2028-01-01T00:00:00Z'])assert.deepEqual(countdownTo(wedding.date,Date.parse(now)),{days:0,hours:0,minutes:0,seconds:0,arrived:true});
});
test('June 12 2027 is Saturday and calendar has all 30 days',()=>{
  const cells=calendarCells(2027,6);
  assert.equal(cells.indexOf(12)%7,6);
  assert.equal(cells.filter(Boolean).length,30);
  assert.equal(cells.length%7,0);
});
test('ICS uses UTC time, escapes content and folds Korean UTF-8 lines',()=>{
  const event=createCalendarEvent({...wedding,groom:'민수',bride:'지연',venue:'예식장, 2층; 정원',address:'서울특별시 '.repeat(15)});
  assert.match(event,/DTSTART:20270612T020000Z/);
  assert.match(event,/DTEND:20270612T030000Z/);
  assert.match(event,/예식장\\, 2층\\; 정원/);
  for(const line of event.split('\r\n')) assert.ok(Buffer.byteLength(line)<=75);
});
test('the map follows real time and only reaches the goal at the wedding time',()=>{
  const before=weddingJourney(wedding.date,Date.parse('2026-01-01T00:00:00Z'));
  assert.equal(before.ratio,0);
  const morning=weddingJourney(wedding.date,Date.parse('2027-06-12T00:00:00Z'));
  assert.equal(morning.days,0); assert.equal(morning.arrived,false); assert.ok(morning.ratio<1);
  const end=weddingJourney(wedding.date,Date.parse('2027-06-12T02:00:00Z'));
  assert.equal(end.ratio,1);assert.equal(end.arrived,true);
  assert.equal(weddingJourney(wedding.date,Date.parse('2028-01-01T00:00:00Z')).ratio,1);
});
test('D-day is based on Korean calendar days, including midnight boundaries',()=>{
  assert.equal(weddingJourney(wedding.date,Date.parse('2027-06-11T14:59:59Z')).days,1);
  assert.equal(weddingJourney(wedding.date,Date.parse('2027-06-11T15:00:00Z')).days,0);
});
test('running continues past the former finish line; obstacles keep appearing',()=>{
  const state=createRunnerState();
  for(let i=0;i<120*60;i++)stepRunner(state,1/60);
  assert.ok(state.distance>7000);assert.ok(state.hits>3);
  const ahead=obstaclesBetween(state.distance,state.distance+1000);
  assert.ok(ahead.length>=2);assert.ok(ahead.every(item=>item.x>=state.distance));
});
test('an actual ground collision slows both runners, once, then recovers',()=>{
  const state=createRunnerState();state.distance=520;
  for(let i=0;i<60;i++)stepRunner(state,1/60);
  assert.equal(state.hits,1);assert.ok(runnerSpeed(state)<RUN_SPEED*.7);
  for(let i=0;i<150;i++)stepRunner(state,1/60);
  assert.equal(state.hits,1);assert.equal(runnerSpeed(state),RUN_SPEED);
});
test('manual jumping clears a collision; automatic jumps clear the first obstacle',()=>{
  const state=createRunnerState();
  for(let i=0;i<240;i++)stepRunner(state,1/60);
  assert.equal(state.hits,0);
  // Both characters are airborne when their hitboxes cross the rock.
  state.distance=500;requestJump(state);
  for(let i=0;i<150;i++)stepRunner(state,1/60);
  assert.equal(state.hits,0);
});
