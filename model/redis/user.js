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
	gets(ids,cb){
		const keys=[]
		for(let i=0,l=ids.length,id; i<l; i++){
			id=ids[i]
			if (!id) continue
			keys.push(`mysg:u:${id}`)
		}
		client.send_command('mget',keys,(err,results)=>{
			if (err) return cb(err)
			if (!results || !results.length) return cb(null,results)
			const m=client.batch()
			for(let i=0,l=keys.length,k; i<l; i++){
				k=keys[i]
				if (!k) continue
				m.expire(k,EXPIRY)
			}
			m.exec()

			const output=[]
			for(let i=0,l=results.length,r; i<l; i++){
				r=results[i]
				if (!r) continue
				try{ output.push(JSON.parse(r)) }
				catch(ex){return cb(ex)}
			}
			cb(null, output)
		})
	},
	set(user,cb){
		client.set(`mysg:u:${user.id}`,JSON.stringify(user),'EX',EXPIRY,cb)
	}
}
