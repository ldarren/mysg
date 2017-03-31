const
fb=require('api/fbJSON'),
rdTrip=require('redis/trip')

return {
	setup(context,cb){
		cb()
	},
	myTrip(user,cmd,msg,next){
		rdTrip.myTrip(user,4,(err,cursor,trips)=>{
			if (err) return next(this.error(500,err))
			let t

			switch(trips.length){
			case 0: Object.assign(msg,fb.message(user,fb.text('You have not created any trip yet'))); break
			case 1:
				t=trips[0]
				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateButton(
							t.pickup.join(',')+' > '+t.dropoff.join(',')+'\n'+fb.toDateTime(user,t.date),
							[
								fb.btnPostback('Detail','detail:'+t.id),
								fb.btnPostback('Passengers','viewPassenger:'+t.id),
								fb.btnPostback('Back','askAction')
							]
						)
					)
				))
				break
			default:
				if (trips.length > 4){
					trips=trips.slice(0,4)
					console.warn(`discarded ${trips.length-4} trips`)
				}
				const
				elements=[],
				buttons=[]

				for(let i=0; t=trips[i]; i++){
					elements.push(fb.element(
						t.pickup.join(',')+' > '+t.dropoff.join(','),
						fb.toDateTime(user,t.date),
						undefined,
						[
							fb.btnPostback('Detail','detail:'+t.id)
						]
					))
				}

				if (0==cursor) buttons.push(fb.btnPostback('Back','askAction'))
				else buttons.push(fb.btnPostback('View More','moreTrip:'+cursor))

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
	myRide(user,cmd,msg,next){
		rdTrip.myRide(user,4,(err,cursor,trips)=>{
			if (err) return next(this.error(500,err))
			let t

			switch(trips.length){
			case 0: Object.assign(msg,fb.message(user,fb.text('You have not booked any trip yet'))); break
			case 1:
				t=trips[0]
				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateButton(
							t.pickup.join(',')+' > '+t.dropoff.join(',')+'\n'+fb.toDateTime(user,t.date),
							[
								fb.btnPostback('Detail','detail:'+t.id),
								fb.btnPhoneNumber('Call Driver',t.contact),
								fb.btnPostback('Back','askAction')
							]
						)
					)
				))
				break
			default:
				if (trips.length > 4){
					trips=trips.slice(0,4)
					console.warn(`discarded ${trips.length-4} trips`)
				}
				const
				elements=[],
				buttons=[]

				for(let i=0; t=trips[i]; i++){
					elements.push(fb.element(
						t.pickup.join(',')+' > '+t.dropoff.join(','),
						fb.toDateTime(user,t.date),
						undefined,
						[
							fb.btnPostback('Detail','detail:'+t.id)
						]
					))
				}

				if (0==cursor) buttons.push(fb.btnPostback('Back','askAction'))
				else buttons.push(fb.btnPostback('View More','moreRide:'+cursor))

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
	findByDate(user,cmd,trips,next){
		rdTrip.findByDate(cmd.date,(err, list)=>{
			if (err) return next(this.error(500,err))
			trips.push(...list)
			next()
		})
	},
	findByTime(user,cmd,trips,next){
		rdTrip.findByTime(cmd.date,(err, list)=>{
			if (err) return next(this.error(500,err))
			trips.push(...list)
			next()
		})
	},
	foundTrips(user,trips,msgs,next){
		switch(trips.length){
		case 0: msgs.push(fb.message(user,fb.text('No trip found on this date.\ntype help to search again'))); break
		default:
			for(let i=0,t; t=trips[i]; i++){
				msgs.push(fb.message(
					user,
					fb.attachment(
						fb.templateButton(
							t.pickup.join(',')+' > '+t.dropoff.join(',')+'\n'+fb.toDateTime(user,t.date),
							[
								fb.btnPostback('Detail','detail:'+t.id),
								fb.btnPostback('Book','join:'+t.id),
								fb.btnPostback('Back','askAction')
							]
						)
					)
				))
			}
			break
		}
		next()
	},
	join(user,action,msgs,next){
console.log('join',action)
		if (!action || !action.length) return next()
		rdTrip.get(action.pop(),(err, trip)=>{
			if (err) {
				msgs.push(fb.message(user,fb.text('Error in joining trip, type help to try again')))
				return next(this.error(500,err))
			}
			if (!trip) {
				msgs.push(fb.message(user,fb.text('Trip already expired, type help to try again')))
				return next(this.error(500,err))
			}
			rdTrip.join(user,trip,(err)=>{
				if (err) {
					msgs.push(fb.message(user,fb.text('Error in joining trip, type help to try again')))
					return next(this.error(500,err))
				}
				msgs.push(fb.message(user,fb.text('You have join a trip, type help for further help')))
				msgs.push(fb.message({id:trip.creator},fb.text(`${user.first_name} ${user.last_name} has joined of the trip you created, type help for more info`)))

				next()
			})
		})
	}
}
