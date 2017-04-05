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
scan=function(cursor,match,count,output,cb){
	client.scan(cursor,'MATCH',match,'COUNT',count,(err,result)=>{
		if (err) return cb(err)
		const [newCursor,list]=result
		output.push(...list)
		if (0==newCursor || list.length >= count) return cb(null, newCursor, output)
		scan(newCursor,match,count-list.length,output,cb)
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

		client.zrangebyscore(KEY_DATE,datetime,datetime+HOUR1,(err,list)=>{
			if (err) return cb(err)
			tripsInTimeslots(list,0,[],cb)
		})
	},
	myTrip(user,limit,cb){
		scan(0,`mysg:t:${user.id}-*`,limit,[],(err,cursor,list)=>{
			if (err) return cb(err)
			if (!list || !list.length) return cb(null, cursor, list)
			client.send_command('mget',list,(err,result)=>{
				if (err) return cb(err)
				const output=[]
				for(let i=0,l=result.length,r; i<l; i++){
					r=result[i]
					if (!r) continue
					try { output.push(JSON.parse(r)) }
					catch(ex) { return cb(ex)}
				}
				return cb(null,cursor,output)
			})
		})
	},
	myRide(user,limit,cb){
		scan(0,`mysg:tmr:${user.id}-*`,limit,[],(err,cursor,rides)=>{
			if (err) return cb(err)
			if (!rides || !rides.length) return cb(null, cursor, rides)
			client.send_command('mget',rides,(err,ids)=>{
				if (err) return cb(err)
				const keys=[]
				for(let i=0,l=ids.length,k; i<l; i++){
					k=ids[i]
					if (!k) continue
					keys.push(`mysg:t:${k}`)
				}
				client.send_command('mget',keys,(err,result)=>{
					if (err) return cb(err)
					const output=[]
					for(let i=0,l=result.length,r; i<l; i++){
						r=result[i]
						if (!r) continue
						try { output.push(JSON.parse(r)) }
						catch(ex) { return cb(ex)}
					}
					return cb(null,cursor,output)
				})
			})
		})
	},
	get(id,cb){
		client.get(`mysg:t:${id}`,(err,json)=>{
			if (err) return cb(err)
			try{var trip=JSON.parse(json)}
			catch(ex){return cb(ex)}
			cb(null,trip)
		})
	},
	set(user,trip,cb){
		if (!user.id || !trip.date) return cb('invalid input')
		const
		datetime=Floor(trip.date/1000),
		date=Floor(datetime/DAY1),
		expireat=datetime+DAY1,
		creator=user.id,
		id=`${creator}-${Date.now()}`,
		KEY_TRIP=`mysg:t:${id}`,
		KEY_DATE=`mysg:td:${date}`,
		KEY_TIME=`mysg:tt:${datetime}`

		trip.creator=creator
		trip.id=id

		client.multi()
		.set(KEY_TRIP,JSON.stringify(trip))
		.expireat(KEY_TRIP,expireat)
		.sadd(KEY_TIME,KEY_TRIP)
		.expireat(KEY_TIME,expireat)
		.zadd(KEY_DATE,datetime,KEY_TIME)
		.expireat(KEY_DATE,expireat)
		.exec(cb)
	},
	// key= unixtime-userid
	join(user,trip,cb){
		if (!user.id || !trip.id || !trip.date) return cb('invalid input')
		const
		id=trip.id,
		datetime=Floor(trip.date/1000),
		expireat=datetime+DAY1,
		KEY_RIDE=`mysg:tr:${id}`

		client.multi()
		.set(`mysg:t:${id}`,JSON.stringify(trip))
		.sadd(KEY_RIDE,user.id)
		.expireat(KEY_RIDE,expireat)
		.set(`mysg:tmr:${user.id}-${Date.now()}`,id,'EX',expireat)
		.exec(cb)
	},
	passenger(id,cb){
		client.smembers(`mysg:tr:${id}`,cb)
	}
}
