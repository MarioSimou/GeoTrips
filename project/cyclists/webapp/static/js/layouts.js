let boxplotLayout = {
		  	font: {family: 'Poppins, sans-serif', size: 14, color: 'darkslategrey'},
			paper_bgcolor: 'rgba(0,0,0,0)',
			plot_bgcolor: 'rgba(0,0,0,0)',
			margin : {l:0,r:0,b:40,t:10,pad:4},
			autosize: true,
			 xaxis: {
                type: 'linear',
				gridcolor: 'rgba(255, 255, 255,0)',
            	zerolinecolor: 'rgba(255, 255, 255,0)',
            },
            yaxis: {
                showticklabels: false,
		  		type: 'linear',
            	gridcolor:'rgba(255, 255, 255,0)',
            	zerolinecolor:'rgba(255, 255, 255,0)',
            }
			}
let temporalLayout = {
	  	font: {family: 'Poppins, sans-serif', size: 14,color: 'darkslategrey'	},
		yaxis: '',
		xaxis: '',
		showlegend: false,
		legend: {x: 0.5, y: 0.5,"orientation": 'v'},
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		margin : {l:65, r:20, b:40, t:40, pad:4}, autosize: true,
		};

let distributionLayout = {
	  	font: {family: 'Poppins, sans-serif', size: 14,color: 'darkslategrey'	},
		yaxis: {'title': 'P( X = duration )'},
		xaxis: {'title': 'duration (s)', 'range':[0,5000]},
		barmode: 'overlay',
		legend: true,
		showlegend:true,
		legend: {x: 0.5, y: 0.5,"orientation": 'v'},
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		margin : {l:65, r:20, b:40, t:40, pad:4}, autosize: true,
		};
let scatterLayout = {
			font: {family: 'Poppins, sans-serif', size: 14, color: 'darkslategrey'},
			paper_bgcolor: 'rgba(0,0,0,0)',
			plot_bgcolor: 'rgba(0,0,0,0)',
			margin : {l:0, r:0, b:0, t:0, pad: 1},
			showlegend: false,
			autosize: false,
			width: 180,
			height: 180,
			scene: {
            aspectratio: {
                x: 1,
                y: 1,
                z: 1
            },
            camera: {
                center: {
                    x: 0,
                    y: 0,
                    z: 0
                },
                eye: {
                    x: 1.25,
                    y: 1.25,
                    z: 1.25
                },
                up: {
                    x: 0,
                    y: 0,
                    z: 1
                }
            },
            xaxis: {
                type: 'linear',
				gridcolor: 'rgb(255, 255, 255)',
            	zerolinecolor: 'rgb(255, 255, 255)',
            	showbackground: false,
            },
            yaxis: {
                type: 'linear',
            	gridcolor:'rgb(255, 255, 255)',
            	zerolinecolor:'rgb(255, 255, 255)',
            	showbackground:false,
            },
            zaxis: {
                type: 'linear',
				gridcolor:'rgb(255, 255, 255)',
            	zerolinecolor:'rgb(255, 255, 255)',
            	showbackground:false,
            },
            aspectratio : { x:1, y:1, z:0.7 },
        	aspectmode : 'manual',
        }
};