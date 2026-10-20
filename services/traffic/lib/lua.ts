/** One script is the mutation boundary; no application read/add/save sequence. */
export const recordTrafficLua = `
local function kind(key)
 local t=redis.call('TYPE',key); if type(t)=='table' then return t.ok else return t end
end
local function validNumber(n)
 return not n or ((n=='0' or string.match(n,'^[1-9]%d*$')) and tonumber(n)<=9007199254740000)
end
local expected={'string','set','string','string','set','hash','hash','string','string','string'}
for i=1,#KEYS do local t=kind(KEYS[i]); if t~='none' and t~=expected[i] then return redis.error_reply('invalid_counter_state') end end
for _,i in ipairs({1,4,8,9}) do if not validNumber(redis.call('GET',KEYS[i])) then return redis.error_reply('invalid_counter_state') end end
local minute=tonumber(redis.call('GET',KEYS[8]) or '0')
local day=tonumber(redis.call('GET',KEYS[9]) or '0')
if minute>=tonumber(ARGV[4]) or day>=tonumber(ARGV[5]) then return {-1} end
redis.call('INCR',KEYS[8]);redis.call('EXPIRE',KEYS[8],120)
redis.call('INCR',KEYS[9]);redis.call('EXPIRE',KEYS[9],172800)
if ARGV[1]=='read' then return {tonumber(redis.call('GET',KEYS[1]) or '0'),redis.call('SCARD',KEYS[2])} end
if redis.call('EXISTS',KEYS[3])==1 then return {0} end
if redis.call('SCARD',KEYS[2])>=tonumber(ARGV[7]) and redis.call('SISMEMBER',KEYS[2],ARGV[6])==0 then return {-1} end
for _,i in ipairs({6,7}) do local field=ARGV[i==6 and 2 or 3];if not validNumber(redis.call('HGET',KEYS[i],field)) then return redis.error_reply('invalid_counter_state') end end
redis.call('SET',KEYS[10],ARGV[8],'NX')
redis.call('SET',KEYS[3],'1','EX',86400)
redis.call('INCR',KEYS[1]);redis.call('SADD',KEYS[2],ARGV[6])
redis.call('INCR',KEYS[4]);redis.call('SADD',KEYS[5],ARGV[6])
redis.call('EXPIRE',KEYS[4],34560000);redis.call('EXPIRE',KEYS[5],34560000)
redis.call('HINCRBY',KEYS[6],ARGV[2],1);redis.call('HINCRBY',KEYS[7],ARGV[3],1)
return {1}
`;
