const EXPIRY=60*60*24*14

let client

module.exports={
	setup(context,cb){
		client=context.mysgRD
		cb()
	},
	get(id,cb){
		const key=`mysg:u:${id}`
		client.get(key,(err,result)=>{
			if (err) return cb(err)
			if (!result) return cb()
			client.expire(key,EXPIRY)
			try{ var user=JSON.parse(result) }
			catch(ex){return cb(ex)}
			cb(null, user)
		})
	},
	set(user,cb){
		client.set(`mysg:u:${user.id}`,JSON.stringify(user),'EX',EXPIRY,cb)
	}
}
