const
DAY1=1000*60*60*24,
DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
timeChecker=new RegExp(/^(0?[1-9]|1[012])[:\.]([0-5]\d)[ap]m$/),
spaceRM=new RegExp(/\s+/g,''),
timeSplit=new RegExp(/[:\.]/),
rdAction=require('redis/action')

return {
	setup(context,cb){
		cb()
	},
	askDate(user,msg,next){
		const
		replies=[],
		now=Date.now()

		for(let i=0,t,d; i<7; i++){
			t=now+DAY1*i
			d=new Date(t)
			replies.push({
				content_type:'text',
				title:`${DAYS[d.getDay()]}:${d.getDate()}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`,
				payload:d.toLocaleDateString()
			})
		}
		Object.assign(msg,{
			recipient:{id:user.id},
			message:{
				text:'Add trip on which date?',
				quick_replies:replies
			}
		})
		next()
	},
	addDate(user,action,evt,next){
		const msg=evt.message

		if(!msg || !msg.quick_reply || !msg.quick_reply.payload) return next(null,'fb/askTripDate')
		action.pop()
		action.push('-',msg.quick_reply.payload)
		next()
	},
	//askTime generated by createMsg
	addTime(user,action,evt,next){
		const msg=evt.message

		if(!msg || !msg.text) return next(null,'fb/askTripTime')
		const txt=msg.text.toLowerCase().replace(spaceRM, '')
		if (!timeChecker.test(txt)) return next(null,'fb/askTripTime')
		const add='p'===txt.charAt(txt.length-2)?12:0
		const [hr,min]=txt.slice(0,-2).split(timeSplit)
		action.pop()
		action.push('+@date', (parseInt(hr)+add)+':'+min)
		next()
	},
	addPickup(user,action,evt,name,next){
		const msg=evt.message

		const a=action.pop()
		if(!msg || !msg.text) return next(null,`fb/ask${a}`)
		const v=msg.text
		switch(a){
		case 'TripFirstPickup':
			switch(v.toLowerCase()){
			case 'done': return next(null,`fb/ask${a}`)
			default:
				action.push('-',v)
				this.set(name,'TripPickup')
				break
			}
			break
		case 'TripPickup':
			switch(v.toLowerCase()){
			case 'done':
				action.push('+:pickup',null)
				this.set(name,'TripFirstDropoff')
				break
			default:
				action.push('-',v)
				this.set(name,'TripPickup')
				break
			}
			break
		default: return next(null,`fb/ask${a}`)
		}
		next()
	},
	addDropoff(user,action,evt,name,next){
		const msg=evt.message

		const a=action.pop()
		if(!msg || !msg.text) return next(null,`fb/ask${a}`)
		const v=msg.text
		switch(a){
		case 'TripFirstDropoff':
			switch(v.toLowerCase()){
			case 'done': return next(null,`fb/ask${a}`)
			default:
				action.push('-',v)
				this.set(name,'TripDropoff')
				break
			}
			break
		case 'TripDropoff':
			switch(v.toLowerCase()){
			case 'done':
				action.push('+:dropoff',null)
				this.set(name,'TripPrice')
				break
			default:
				action.push('-',v)
				this.set(name,'TripDropoff')
				break
			}
			break
		default: return next(null,`fb/ask${a}`)
		}
		next()
	},
	addPrice(user,action,evt,next){
		const msg=evt.message

		action.pop()
		action.push('+$price', msg.text || 'ASK DRIVER')
		next()
	},
	addNote(user,action,evt,next){
		const msg=evt.message

		action.pop()
		action.push('+$note', msg.text || 'NO REMARK')
		next()
	},
}
