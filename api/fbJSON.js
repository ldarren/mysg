const
HOUR1=1000*60*60

return {
	toDate(){
		return (new Date(utc+user.timezone*HOUR1)).toLocaleDateString()
	},
	toTime(){
		return (new Date(utc+user.timezone*HOUR1)).toLocaleTimeString()
	},
	toDateTime(user,utc){
		return (new Date(utc+user.timezone*HOUR1)).toLocaleString()
	},
	message(user,message){
		return {
			recipient:{id:user.id},
			message
		}
	},
	text(msg,quick_replies){ return { text:msg, quick_replies } },
	attachment(payload){
		return {
			attachment:{
				type:'template',
				payload
			}
		}
	},
	templateButton(text,buttons){
		console.assert(buttons.length, 'button too few buttons:'+buttons)
		console.assert(buttons.length<4, 'button too many buttons:'+buttons.length)

		return {
			template_type:'button',
			text,
			buttons
		}
	},
	templateGeneric(elements){
		return {
			template_type:'generic',
			elements
		}
	},
	templateList(elements,buttons){
		console.assert(elements.length, 'list too few elements:'+elements)
		console.assert(elements.length<5, 'list too many elements:'+elements.length)
		console.assert(buttons.length<2, 'list too many buttons:'+buttons.length)

		return {
			template_type:'list',
			top_element_style:'compact',
			elements,
			buttons
		}
	},
	element(title,subtitle,default_action,buttons,image_url){
		console.assert(title, 'missing element title')

		return {
			title,
			subtitle,
			default_action, // default button wo title
			buttons,
			image_url
		}
	},
	btnURL(title,url,fallback_url,webview_height_ratio='compact'){
		return { type:'web_url', title, url, webview_height_ratio, fallback_url }
	},
	btnPostback(title, payload){
		return { type:'postback', title, payload }
	},
	btnPhoneNumber(title,payload){
		return { type:'phone_number', title, payload } 
	},
	btnShare(share_contents){
		return { type:'element_share', share_contents}  
	},
	quickTextReply(title,payload,image_url){
		return { content_type:'text', title, payload, image_url }
	},
	quickLocationReply(){
		return { content_type:'location' }
	}
}
