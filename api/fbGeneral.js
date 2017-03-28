const
fb=require('api/fb'),
rdUser=require('redis/user'),
rdAction=require('redis/action'),
rdTrip=require('redis/trip'),
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
		Object.assign(msg,{
			recipient:{id:user.id},
			message:{
				text:`Hi ${user.first_name} ${user.last_name}, what is role?`,
				quick_replies:[{
					content_type:'text',
					title:'Passenger',
					payload:'passenger'
				},{
					content_type:'text',
					title:'Driver',
					payload:'driver'
				}]
			}
		})
		next()
	},
	addRole(user,action,evt,next){
		const msg=evt.message

		if(!msg || !msg.quick_reply) return next(null,'fb/askRole')
		switch(msg.quick_reply.payload){
		case 'passenger':
		case 'driver':
			user.role=msg.quick_reply.payload
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
			Object.assign(msg,{
				recipient:{id:user.id},
				message:{
					text:'How can i help you?',
					quick_replies:[{
						content_type:'text',
						title:'Add new trip',
						payload:'ADD_TRIP'
					},{
						content_type:'text',
						title:'View my trips',
						payload:'MY_JOB'
					},{
						content_type:'text',
						title:'Change Role',
						payload:'CHN_ROLE'
					}]
				}
			})
		}else{
			Object.assign(msg,{
				recipient:{id:user.id},
				message:{
					text:'How can i help you?',
					quick_replies:[{
						content_type:'text',
						title:'Find trip by time',
						payload:'FIND_TIME'
					},{
						content_type:'text',
						title:'Find trip by date',
						payload:'FIND_DATE'
					},{
						content_type:'text',
						title:'View my rides',
						payload:'MY_RIDE'
					},{
						content_type:'text',
						title:'Change Role',
						payload:'CHN_ROLE'
					}]
				}
			})
		}
		next()
	},
	$addAction(user,action,evt,name,next){
		const msg=evt.message
		if(!msg || !msg.quick_reply) return next(null,'fb/askAction')
		action.length=0
		if ('driver'===user.role){
			switch(msg.quick_reply.payload){
			case 'ADD_TRIP':
				action.push('addTrip')
				this.set(name,'TripDate')
				break
			case 'MY_JOB':
				action.push('myJob')
				return next(null, 'fb/compileAction')
			case 'CHN_ROLE':
				return next(null,'fb/askRole')
			default: return next(null,'fb/askAction')
			}
		}else{
			switch(msg.quick_reply.payload){
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
		Object.assign(msg,fb.message(fb.text(text)))
		next()
	}
}
