const
rdAction=require('redis/action'),
rdUser=require('redis/user'),
EXPIRY=1000*60*60*24*30,
HEADERS={headers:{'Content-Type':'application/json'}},
entryQ=[],
parseEntries=function(entries,cb){
	if (!entries.length) return cb()
	const entry=entries.pop()
	if (PAGE_ID!==entry.id || EXPIRY < (Date.now()-entry.time)) return cb(`unknown or expired entry ${JSON.stringify(entry)}`)
	parseEvts(entry.messaging,(err)=>{
		if (err) return cb(err)
		parseEntries(entries,cb)
	})
},
parseEvts=function(evts,cb){
	if (!evts.length) return cb()
	const evt=evts.pop()

	console.log('[%s] received- %s', (new Date(evt.timestamp)).toLocaleString(),JSON.stringify(evt))

	rdUser.get(evt.sender.id,(err,user)=>{
		if (err) return cb(err)
		if (!user) {
			sigslot.signal('fb/addUser','custom',evt.sender,[])
			return parseEvts(evts,cb)
		}
console.log(`parseEvt user: ${JSON.stringify(user)}`)
		rdAction.get(evt.sender.id,(err,action)=>{
			if (err) return cb(err)
console.log(`parseEvt action: ${JSON.stringify(action)}`)
			if (!action || !action.length) {
				sigslot.signal('fb/lostAt','custom',user,[],'Action')
				return parseEvts(evts,cb)
			}
			if (evt.postback) sigslot.signal('fb/postback','custom',user,action,evt)
			else sigslot.signal(`fb/add${action[action.length-1]}`,'custom',user,action,evt)
			parseEvts(evts,cb)
		})
	})
},
queue=function(entries){
	entryQ.push(...entries)
	if (queuing) return
	queuing=true
	parseEntries(entryQ,(err)=>{
		queuing=false
		if (err) console.error(err)
		if (entryQ.length) return queue([]) // print error and requeue
	})
},
send=function(obj,next){
	const json=JSON.stringify(obj)
	pico.ajax('POST',URL_MSG,json,HEADERS,(err,state,res)=>{
		if (4!==state) return
		if (err) console.log(JSON.stringify(err.src))
		if (err) return next(this.error(err.code,`ko send[${json}] error[${err.src}]`))

		this.log(`ok send[${json}] res[${res}]`)
		next()
	})
},
spam=function(self,objs,i,cb){
	if (i >= objs.length) return cb()
	send.call(self,objs[i++],()=>{
		return spam(self,objs,i,cb)
	})
}

let
URL_MSG='https://graph.facebook.com/v2.6/me/messages?access_token=',
URL_USER='https://graph.facebook.com/v2.6/UID?fields=first_name,last_name,profile_pic,locale,timezone,gender&access_token=',
queuing=false,
TOKEN,
PAGE_ID,
sigslot

return {
	setup(context,cb){
		const app=context.config.app
		sigslot=app.sigslot
		PAGE_ID=app.fbPageId
		TOKEN=app.fbPageToken
		URL_MSG=URL_MSG+TOKEN
		cb()
	},
	$route(req,next){
        switch(req.method){
        case 'POST': return next()
        case 'GET': return next(null, 'fb/validate')
        } 
        next(null, this.sigslot.abort())
	},
	// must return 200 asap or risk of suspension
	parse(body,next){
		if ('page'===body.object) queue(body.entry)
		else this.error('unknown webhook body',body)
		next()
	},
	verify(query,next){
		if ('subscribe'===query['hub.mode'] && 'mysgl'===query['hub.verify_token']){
			this.setOutput(query['hub.challenge'])
			return next()
		}
		next(this.error(403,'Failed validation. Make sure the validation tokens match.'))
	},
	prepare(){
		const
		al=arguments.length-1,
		next=arguments[al],
		args=this.args
		for(let i=0; i<al; i++){
			this.set(arguments[i],args[i])
		}
		next()
	},
	getUser(user,next){
		pico.ajax('GET',URL_USER.replace('UID',user.id)+TOKEN,null,HEADERS,(err,state,res)=>{
			if (4!==state) return
			if (err) next(this.error(`ko getUser[${JSON.stringify(user)}] error[${JSON.stringify(err)}]`))

			this.log(`ok getUser[${JSON.stringify(user)}] res[${res}]`)
			let newUser
			try{ newUser=JSON.parse(res) }
			catch(ex){return next(ex)}
			Object.assign(user,newUser)
			rdUser.set(user,(err)=>{
				if (err) return next(err)
				next()
			})
		})
	},
	send:send,
	spam(objs,next){
		return spam(this,objs,0,next)
	}
}
