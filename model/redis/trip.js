const
Floor=Math.floor,
HOUR1=60*60,
DAY1=HOUR1*24,
tripsInTimeslots=function(keys,idx,trips,cb){
	if (idx >= keys.length) return cb(null,trips)
	tripsInTimeslot(keys[idx++],(err,list)=>{
		if (err) return cb(err)
		trips.push(...list)
		return tripsInTimeslots(keys,idx,trips,cb)
	})
},
tripsInTimeslot=function(key,cb){
	client.smembers(key,(err, set)=>{
		if (err) return cb(err)
		client.mget(...set,(err,jsons)=>{
			if (err) return cb(err)
			const trips=[]
			for(let i=0,l=jsons.length,j; i<l; i++){
				j=jsons[i]
				if (!j) continue
				try {trips.push(JSON.parse(j))}
				catch(ex){return cb(ex)}
			}
			return cb(null,trips)
		})
	})
},
scan=function(cursor,match,count,result,cb){
	client.scan(cursor,'MATCH',match,'COUNT',count,(err,result)=>{
		if (err) return cb(err)
		const [newCursor,list]=result
		result.push(...list)
		if (list.length >= count) return cb(null, newCursor, result)
		scan(newCursor,match,count-list.length,result,cb)
	})
}

let client

module.exports={
	setup(context,cb){
		client=context.mysgRD
		cb()
	},
	findByDate(date,cb){
		const
		datetime=Floor(date/1000),
		d=Floor(datetime/DAY1)

		client.zrange(`mysg:td:${d}`,0,-1,(err,list)=>{
			if (err) return cb(err)
			tripsInTimeslots(list,0,[],cb)
		})
	},
	findByTime(date,cb){
		const
		datetime=Floor(date/1000),
		d=Floor(datetime/DAY1),
		KEY_DATE=`mysg:td:${d}`

		client.zrangeByScore(KEY_DATE,datetime,datetime+HOUR1,(err,list1)=>{
			if (err) return cb(err)
			tripsInTimeslots(list2.concat(list1),0,[],cb)
		})
	},
	myTrip(user,limit,cb){
		scan(0,`mysg:t:${user.id}:*`,limit,[],(err,cursor,list)=>{
			if (err) return cb(err)
			if (!list || !list.length) return cb(null, cursor, list)
			client.send_command('mget',list,(err,result)=>{
				if (err) return cb(err)
				const output=[]
				for(let i=0,l=result.length,r; i<l; i++){
					r=result[i]
					if (!r) continue
					try { output.push(JSON.push(r)) }
					catch(ex) { return cb(ex)}
				}
				return cb(null,cursor,output)
			})
		})
	},
	myRide(user,limit,cb){
		scan(0,`mysg:t:${user.id}:*`,limit,[],(err,cursor,list)=>{
			if (err) return cb(err)
			if (!list || !list.length) return cb(null, cursor, list)
			const keys=[]
			for(let i=0,l=list.length,k; i<l; i++){
				k=list[i]
				if (!k) continue
				keys.push(`mysg:t:${k}`)
			}
			client.send_command('mget',keys,(err,result)=>{
				if (err) return cb(err)
				const output=[]
				for(let i=0,l=result.length,r; i<l; i++){
					r=result[i]
					if (!r) continue
					try { output.push(JSON.push(r)) }
					catch(ex) { return cb(ex)}
				}
				return cb(null,cursor,output)
			})
		})
	},
	set(user,trip,cb){
		if (!user.id || !trip.date) return cb('invalid input')
		const
		datetime=Floor(trip.date/1000),
		date=Floor(datetime/DAY1),
		expireat=datetime+DAY1,
		KEY_TRIP=`mysg:t:${user.id}:${Date.now()}`,
		KEY_DATE=`mysg:td:${date}`,
		KEY_TIME=`mysg:tt:${datetime}`

		client.batch()
		.set(KEY_TRIP,JSON.stringify(trip))
		.expireat(KEY_TRIP,expireat)
		.sadd(KEY_TIME,KEY_TRIP)
		.expireat(KEY_TIME,expireat)
		.zadd(KEY_DATE,datetime,KEY_TIME)
		.expireat(KEY_DATE,expireat)
		.exec(cb)
	},
	// key= unixtime:userid
	join(key,user,trip,cb){
		if (!key || !user.id || !trip.date) return cb('invalid input')
		const
		datetime=Floor(trip.date/1000),
		expireat=datetime+DAY1

		client.multi()
		.sadd(`mysg:tr:${key}`,user.id)
		.expireat(KEY_TIME,expireat)
		.set(`mysg:tmr:${user.id}:${Date.now()}`,key,'EX',expireat)
		.exec(cb)
	}
}
