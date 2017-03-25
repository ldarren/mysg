const
DAY1=60*60*24

let client

module.exports={
	setup(context,cb){
		client=context.mysgRD
		cb()
	},
	get(id,cb){
		client.get(`mysg:t:${id}`,(err,result)=>{
			if (err) return cb(err)
			if (!result) return cb()
			try{ var trip=JSON.parse(result) }
			catch(ex){return cb(ex)}
			cb(null, trip)
		})
	},
	set(user,trip,cb){
		const key=`mysg:t:${user.id}`
		client.multi()
		.set(key,JSON.stringify(trip))
		.expireat(key,trip.date+DAY1)
		.exec(cb)
	}
}
