const
fb=require('api/fb'),
rdTrip=require('redis/trip')

return {
	setup(context,cb){
		cb()
	},
	myTrip(user,cmd,msg,next){
		rdTrip.myTrip(user,4,(err,cursor,list)=>{
			if (err) return next(this.error(500,err))
			const
			elements=[],
			buttons=[]

			for(let i=0,l; l=list[i]; i++){
				elements.push(fb.element(
					l.pickup.join(',')+' > '+l.dropoff.join(','),
					l.date.toLocaleString(),
					fb.btnPostback(undefined,'VIEW DETAIL')
					[
						fb.btnPostback('Passengers','VIEW_PASSENGER'),
						fb.btnPostback('Detail','VIEW_DETAIL')
					]
				))
			}

			if (cursor) button.push(fb.btnPostback('View More','MORE_TRIP:'+cursor))
			button.push(fb.btnPostback('Back','ACTION'))

			Object.assign(msg,fb.message(
				fb.attachment(
					fb.templateList(elements,buttons)
				)
			))
			next()
		})
	},
	myRide(user,cmd,template,next){
		rdTrip.myRide(user,4,(err,cursor,list)=>{
			if (err) return next(this.error(500,err))
			const
			elements=[],
			buttons=[]

			for(let i=0,l; l=list[i]; i++){
				elements.push(fb.element(
					l.pickup.join(',')+' > '+l.dropoff.join(','),
					l.date.toLocaleString(),
					fb.btnPostback(undefined,'JOIN')
					[
						fb.btnPhoneNumber('Call driver',l.contact),
						fb.btnPostback('Detail','VIEW_DETAIL')
					]
				))
			}

			if (cursor) button.push(fb.btnPostback('View More','MORE_TRIP:'+cursor))
			button.push(fb.btnPostback('Back','ACTION'))

			Object.assign(msg,fb.message(
				fb.attachment(
					fb.templateList(elements,buttons)
				)
			))
			next()
		})
	}
}
