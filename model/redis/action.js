const EXPIRY=60*60*24

let client

module.exports={
	setup(context,cb){
		client=context.mysgRD
		cb()
	},
	get(id,cb){
		const key=`mysg:a:${id}`
		client.get(key,(err,result)=>{
			if (err) return cb(err)
			if (!result) return cb()
			client.expire(key,EXPIRY)
			try{ var action=JSON.parse(result) }
			catch(ex){return cb(ex)}
			cb(null, action)
		})
	},
	set(user,action,cb){
		client.set(`mysg:a:${user.id}`,JSON.stringify(action),'EX',EXPIRY,cb)
	},
	del(user,cb){
		client.del(`mysg:a:${user.id}`,cb)
	}
}
