const
pObj=pico.export('pico/obj'),
fb=require('api/fbJSON'),
rdTrip=require('redis/trip')

return {
	setup(context,cb){
		cb()
	},
	addPickup(user,action,evt,name,next){
		const text=pObj.dotchain(evt,['message','text'])

		if(!text) return next(null,`fb/ask${action[action.length-1]}`)
		const a=action.pop()
		switch(a){
		case 'TripFirstPickup':
			switch(text.toLowerCase()){
			case 'done': return next(null,`fb/ask${a}`)
			default:
				action.push('-',text)
				this.set(name,'TripPickup')
				break
			}
			break
		case 'TripPickup':
			switch(text.toLowerCase()){
			case 'done':
				action.push('+:pickup',null)
				this.set(name,'TripFirstDropoff')
				break
			default:
				action.push('-',text)
				this.set(name,'TripPickup')
				break
			}
			break
		default: return next(null,`fb/ask${a}`)
		}
		next()
	},
	addDropoff(user,action,evt,name,next){
		const text=pObj.dotchain(evt,['message','text'])

		if(!text) return next(null,`fb/ask${action[action.length-1]}`)
		const a=action.pop()
		switch(a){
		case 'TripFirstDropoff':
			switch(text.toLowerCase()){
			case 'done': return next(null,`fb/ask${a}`)
			default:
				action.push('-',text)
				this.set(name,'TripDropoff')
				break
			}
			break
		case 'TripDropoff':
			switch(text.toLowerCase()){
			case 'done':
				action.push('+:dropoff',null)
				this.set(name,'TripSeat')
				break
			default:
				action.push('-',text)
				this.set(name,'TripDropoff')
				break
			}
			break
		default: return next(null,`fb/ask${a}`)
		}
		next()
	},
	done(user,cmd,msg,next){
console.log('addTrp.done',user,cmd)
		rdTrip.set(user,cmd,(err)=>{
			if (err) Object.assign(msg, fb.message(user,fb.text(`An error has encountered when adding your trip: ${err}.\ntype help for more action`)))
			else Object.assign(msg, fb.message(user,fb.text(`New trip on ${fb.toDateTime(user,cmd.date)} has been added.\ntype help for more action`)))
			next()
		})
	}
}
