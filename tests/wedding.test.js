import test from 'node:test';
import assert from 'node:assert/strict';
import { countdownTo, koreaDateParts, calendarCells, createCalendarEvent } from '../date-utils.js';
import { obstacleJump, OBSTACLES } from '../runner.js';
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
test('automatic jumps clear every obstacle and land between obstacles',()=>{
  for(const obstacle of OBSTACLES) {
    for(let offset=-10;offset<=30;offset+=5) assert.ok(obstacleJump(obstacle.x+offset)>45);
    assert.equal(obstacleJump(obstacle.x+130),0);
  }
});
