// https://github.com/wooorm/gemoji/blob/master/support.md
const
fb=require('api/fbJSON'),
rdTrip=require('redis/trip'),
detailView=function(user,trip){
	return	'\uD83D\uDD56 '+fb.toDateTime(user,trip.date)+'\n'+
			'\ud83d\ude90 '+trip.pickup.join(', ')+'\n'+
			'\ud83c\udfc1 '+trip.dropoff.join(', ')+'\n'+
			'\ud83d\udcb2 '+trip.price+'\n'+
			'\uD83D\uDCBA '+trip.seat+'\n'+
			'\uD83D\uDCDE '+trip.contact+'\n'+
			'\u270d\ufe0f '+trip.note
},
title4Driver=function(user,trip){
	const title=trip.note
	if (!title || 'NA'===title) return fb.toDateTime(user,trip.date)
	return title
},
summary4Driver=function(user,trip){
	return	'\uD83D\uDD56 '+fb.toDateTime(user,trip.date)+'\n'+
			'\uD83D\uDCBA '+trip.seat
},
title4Passenger=function(user,trip){
	const title=trip.note
	if (!title || 'NA'===title) return fb.toDateTime(user,trip.date)
	return title
},
summary4Passenger=function(user,trip){
	return	'\uD83D\uDD56 '+fb.toDateTime(user,trip.date)+'\n'+
			'\ud83d\ude90 '+trip.pickup.join(', ')+'\n'+
			'\ud83c\udfc1 '+trip.dropoff.join(', ')
}

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
							summary4Driver(user,t),
							[
								fb.btnPostback('Detail','detail:'+t.id),
								fb.btnPostback('Passengers','passenger:'+t.id),
								fb.btnPostback('Back','back:Action')
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
						title4Driver(user,t),
						summary4Driver(user,t),
						undefined,
						[
							fb.btnPostback('Detail','detail:'+t.id)
						]
					))
				}

				if (0==cursor) buttons.push(fb.btnPostback('Back','back:Action'))
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
							summary4Passenger(user,t),
							[
								fb.btnPostback('Detail','detail:'+t.id),
								fb.btnPhoneNumber('Call Driver',t.contact),
								fb.btnPostback('Back','back:Action')
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
						title4Passenger(user,t),
						summary4Passenger(user,t),
						undefined,
						[
							fb.btnPostback('Detail','detail:'+t.id)
						]
					))
				}

				if (0==cursor) buttons.push(fb.btnPostback('Back','back:Action'))
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
							summary4Passenger(user,t),
							[
								fb.btnPostback('Detail','detail:'+t.id),
								fb.btnPostback('Book','join:'+t.id),
								fb.btnPostback('Back','back:Action')
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
				return next()
			}
			trip.seat=parseInt(trip.seat)-1
			if (!trip.seat) {
				msgs.push(fb.message(user,fb.text('No more seat available, type help to try again')))
				return next()
			}
			rdTrip.join(user,trip,(err)=>{
				if (err) {
					msgs.push(fb.message(user,fb.text('Error in joining trip, type help to try again')))
					return next(this.error(500,err))
				}
				msgs.push(fb.message(user,fb.text('You have join a trip, type help for further help')))
				msgs.push(fb.message(
					user,
					fb.attachment(
						fb.templateButton(
							`${user.first_name} ${user.last_name} has joined your trip\n${summary4Driver(user,trip)}`,
							[
								fb.btnPostback('Detail','detail:'+trip.id),
								fb.btnPostback('Back','back:Action')
							]
						)
					)
				))
				next()
			})
		})
	},
	detail(user,action,msg,next){
		rdTrip.get(action.pop(),(err, trip)=>{
			if (err) {
				msgs.push(fb.message(user,fb.text('Error in reading tip info, type help to try again')))
				return next(this.error(500,err))
			}
			if (!trip) {
				msgs.push(fb.message(user,fb.text('Trip already expired, type help to try again')))
				return next()
			}
			Object.assign(msg,fb.message(
				user,
				fb.attachment(
					fb.templateButton(
						detailView(user,trip),
						[
							'driver'===user.role ? fb.btnPostback('Passengers','passenger:'+trip.id) : fb.btnPhoneNumber('Call Driver',trip.contact),
							fb.btnPostback('Back','back:Action')
						]
					)
				)
			))
			next()
		})
	},
	passenger(user,action,msgs,next){
		rdTrip.passenger(action.pop(),(err, userIds)=>{
			if (err) {
				msgs.push(fb.message(user,fb.text('Error in reading passengers, type help to try again')))
				return next(this.error(500,err))
			}
			if (!userIds || !userIds.length) {
				msgs.push(fb.message(user,fb.text('You have no passenger yet, type help to try again')))
				return next()
			}
			rdUser.gets(userIds,(err,users)=>{
				if (err) {
					msgs.push(fb.message(user,fb.text('Error in reading passengers, type help to try again')))
					return next(this.error(500,err))
				}
				const elements=[]
				for(let i=0,u; u=users[i]; i++){
					elements.push(fb.element(
						`${u.first_name} ${u.last_name}`,
						`${u.gender}, ${u.locale}`,
						undefined,
						undefined,
						u.profile_pic
					))
				}
				Object.assign(msg,fb.message(
					user,
					fb.attachment(
						fb.templateGeneric(elements)
					)
				))
				next()
			})
		})
	}
}
