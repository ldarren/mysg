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
				text:`Hi ${user.first_name} ${user.last_name}, who are you?`,
				quick_replies:[{
					content_type:'text',
					title:'Passenger',
					payload:'ROLE_PASSENGER'
				},{
					content_type:'text',
					title:'Driver',
					payload:'ROLE_DRIVER'
				}]
			}
		})
		next()
	},
	addRole(user,action,evt,next){
		const msg=evt.message

		if(!msg || !msg.quick_reply) return next(null,'fb/askRole')
		switch(msg.quick_reply.payload){
		case 'ROLE_PASSENGER':
			user.role='passenger'
			break
		case 'ROLE_DRIVER':
			user.role='driver'
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
					text:`please give me ur action`,
					quick_replies:[{
						content_type:'text',
						title:'Add Trip',
						payload:'ADD_TRIP'
					}]
				}
			})
		}else{
			Object.assign(msg,{
				recipient:{id:user.id},
				message:{
					text:`please give me ur action`,
					quick_replies:[{
						content_type:'text',
						title:'Search by date',
						payload:'FIND_DATE'
					}]
				}
			})
		}
		next()
	},
	addAction(user,action,evt,name,next){
		const msg=evt.message
		if(!msg || !msg.quick_reply) return next(null,'fb/askAction')
		action.length=0
		if ('driver'===user.role){
			switch(msg.quick_reply.payload){
			case 'ADD_TRIP':
				action.push('addtrip')
				this.set(name,'TripDate')
				break
			default: return next(null,'fb/askAction')
			}
		}else{
			switch(msg.quick_reply.payload){
			case 'FIND_DATE':
				action.push('findbydate')
				this.set(name,'FindDate')
				break
			default: return next(null,'fb/askAction')
			}
		}
		next()
	},
	/*
	 * - list, + end of
	 */
	compileAction(user,action,msg,next){
		const	
		type=action.shift(),
		output={type}

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
				output[k.slice(2)]=v1
				j=[]
			}
		}
		Object.assign(msg,{ recipient: { id:user.id }, message: { text:`Added action: ${JSON.stringify(output)}` } })
		rdTrip.set(user,output,(err)=>{
			if (err) console.error(err) // nothing can be done at this step
			next()
		})
	},
	createMsg(user,msg,text,next){
		console.log('createMsg params',this.params)
		Object.assign(msg,{ 
			recipient: { id:user.id }, 
			message: { text }
		})
		next()
	}
}
