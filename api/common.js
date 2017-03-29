const
pObj=pico.export('pico/obj'),
fb=require('api/fbJSON'),
rdUser=require('redis/user'),
rdAction=require('redis/action'),
parseEvt=function(evt){
	if (evt.message) return parseMsg(evt)
	if (evt.postback) return parsePostback(evt)
	console.error('unknown messaging',evt)
},
parsePostback=function(evt){
	const
	senderId = evt.sender.id,
	payload = evt.postback.payload

	console.log('%s user %d@%d postback[%s]', (new Date(evt.timestamp)).toLocaleString(), senderId, evt.recipient.id, payload)

	switch(payload){
	case 'GET_STARTED':
		sendWhoRU(senderId)
		break
	case 'D:ADD_ROUTE':
		sendTextMsg(senderId, 'Let\'s create a new route, first give me the travel start time at "MM DD YY hh:mm" format. example 19/Mar/2017 6:35pm will be 3 19 17 18:35')
		break
	default:
		console.error('unknown payload',payload)
		sendWhoRU(senderId)
		break
	}
}

return {
	setup(context,cb){
		cb()
	},
	askRole(user,msg,next){
		Object.assign(msg,fb.message(
			user,
			fb.text(
				`Hi ${user.first_name} ${user.last_name}, what is your role?`,
				[
					fb.quickTextReply('Passenger','passenger'),
					fb.quickTextReply('Driver','driver')
				]
			)
		))
		next()
	},
	addRole(user,action,evt,next){
		const payload=pObj.dotchain(evt,['message','quick_reply','payload'])

		switch(payload){
		case 'passenger':
		case 'driver':
			user.role=payload
			break
		default: return next(null,'fb/askRole')
		}
		action.pop()
		rdUser.set(user,(err)=>{
			if (err) return next(this.error(500,err))
			next()
		})
	},
	askAction(user,msg,next){
		if ('driver'===user.role){
			Object.assign(msg,fb.message(
				user,
				fb.text(
					'How can i help you?',
					[
						fb.quickTextReply('Add new trip','ADD_TRIP'),
						fb.quickTextReply('View my trips','MY_JOB'),
						fb.quickTextReply('Change Role','CHN_ROLE'),
					]
				)
			))
		}else{
			Object.assign(msg,fb.message(
				user,
				fb.text(
					'How can i help you?',
					[
						fb.quickTextReply('Find trip by time','FIND_TIME'),
						fb.quickTextReply('Find trip by date','FIND_DATE'),
						fb.quickTextReply('View my rides','MY_RIDE'),
						fb.quickTextReply('Change Role','CHN_ROLE'),
					]
				)
			))
		}
		next()
	},
	$addAction(user,action,evt,name,next){
		const payload=pObj.dotchain(evt,['message','quick_reply','payload'])
		if(!payload) return next(null,'fb/askAction')
		action.length=0
		if ('driver'===user.role){
			switch(payload){
			case 'ADD_TRIP':
				action.push('addTrip')
				this.set(name,'TripDate')
				break
			case 'MY_JOB':
				action.push('myTrip')
				return next(null, 'fb/compileAction')
			case 'CHN_ROLE':
				return next(null,'fb/askRole')
			default: return next(null,'fb/askAction')
			}
		}else{
			switch(payload){
			case 'FIND_TIME':
				action.push('findByTime')
				this.set(name,'FindTime')
				break
			case 'FIND_DATE':
				action.push('findByDate')
				this.set(name,'FindDate')
				break
			case 'MY_RIDE':
				action.push('myRide')
				return next(null, 'fb/compileAction')
			case 'CHN_ROLE':
				return next(null,'fb/askRole')
			default: return next(null,'fb/askAction')
			}
		}
		next()
	},
	/*
	 * TODO: test this step when server crash, can the user command flow continue?
	 * - list, + end of
	 */
	$compileAction(user,action,cmd,next){
console.log('$compileAction',JSON.stringify(action))
		cmd['type']=action.shift()

		for(let j=[],v1,k,v; action.length; ){
			k=action.shift()
			v=action.shift()
			switch(k.charAt(0)){
			case '-': j.push(v); break
			case '+':
				if (null !== v) j.push(v);
				switch(k.charAt(1)){
				case '@': // date time
					v1=Date.parse(j.join(' '))
					break
				case '.': // string join
					v1=j.join(' ')
					break
				case '#': // number plus
					v1=j.reduce((acc,val)=>{return acc+=val},0)
					break
				case '$': // immutable
					v1=j[0]
					break
				case ':': // immutable array
					v1=j
					break
				}
				cmd[k.slice(2)]=v1
				j=[]
			}
		}
		action.length=0
		rdAction.del(user)
		next(null, `fb/${cmd.type}`)
	},
	nextStep(user,action,name,next){
		action.push(name)
		rdAction.set(user,action,(err)=>{
			if (err) return next(this.error(500,err))
			next(null,`fb/ask${name}`)
		})
	},
	finalStep(user,action,next){
		rdAction.set(user,action,(err)=>{
			if (err) return next(this.error(500,err))
			next(null,'fb/compileAction')
		})
	},
	createMsg(user,msg,text,next){
		Object.assign(msg,fb.message(user,fb.text(text)))
		next()
	},
	readTextInputTo(action,evt,key,value,next){
		action.pop()
		action.push(key, pObj.dotchain(evt,['message','text'], value))
		next()
	}
}
