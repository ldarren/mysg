const
fb=require('api/fbJSON'),
rdTrip=require('redis/trip')

return {
	setup(context,cb){
		cb()
	},
	myTrip(user,cmd,msg,next){
		rdTrip.myTrip(user,4,(err,cursor,list)=>{
			if (err) return next(this.error(500,err))

			switch(list.length){
			case 0: Object.assign(msg,fb.message(user,fb.text('You have not created any trip yet'))); break
			case 1:
				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateButton(
							trip.pickup.join(',')+' > '+trip.dropoff.join(',')+'\n'+(new Date(trip.date)).toLocaleString(),
							[
								fb.btnPostback('Detail','VIEW DETAIL'),,
								fb.btnPostback('Passengers','VIEW_PASSENGER'),
								fb.btnPostback('Back','ACTION')
							]
						)
					)
				))
				break
			default:
				if (list.length > 4){
					list=list.slice(0,4)
					console.warn(`discarded ${list.length-4} trips`)
				}
				const
				elements=[],
				buttons=[]

				for(let i=0,l; l=list[i]; i++){
					elements.push(fb.element(
						l.pickup.join(',')+' > '+l.dropoff.join(','),
						(new Date(l.date)).toLocaleString(),
						undefined,
						[
							fb.btnPostback('Detail','VIEW DETAIL')
						]
					))
				}

				if (0==cursor) buttons.push(fb.btnPostback('Back','ACTION'))
				else buttons.push(fb.btnPostback('View More','MORE_TRIP:'+cursor))

				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateList(elements,buttons)
					)
				))
				break
			}
			next()
		})
	},
	myRide(user,cmd,template,next){
		rdTrip.myTrip(user,4,(err,cursor,list)=>{
			if (err) return next(this.error(500,err))

			switch(list.length){
			case 0: Object.assign(msg,fb.message(user,fb.text('You have not created any trip yet'))); break
			case 1:
				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateButton(
							trip.pickup.join(',')+' > '+trip.dropoff.join(',')+'\n'+(new Date(trip.date)).toLocaleString(),
							[
								fb.btnPostback('Detail','VIEW DETAIL'),,
								fb.btnPostback('Passengers','VIEW_PASSENGER'),
								fb.btnPostback('Back','ACTION')
							]
						)
					)
				))
				break
			default:
				if (list.length > 4){
					list=list.slice(0,4)
					console.warn(`discarded ${list.length-4} trips`)
				}
				const
				elements=[],
				buttons=[]

				for(let i=0,l; l=list[i]; i++){
					elements.push(fb.element(
						l.pickup.join(',')+' > '+l.dropoff.join(','),
						(new Date(l.date)).toLocaleString(),
						undefined,
						[
							fb.btnPostback('Detail','VIEW DETAIL')
						]
					))
				}

				if (0==cursor) buttons.push(fb.btnPostback('Back','ACTION'))
				else buttons.push(fb.btnPostback('View More','MORE_TRIP:'+cursor))

				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateList(elements,buttons)
					)
				))
				break
			}
			next()
		})
	}
}
