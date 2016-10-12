var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var faker = require("faker");
var fs = require("fs");
faker.locale = "en";
var mock = require('mock-fs');
var _ = require('underscore');
var Random = require('random-js');

function main()
{
	var args = process.argv.slice(2);

	if( args.length == 0 )
	{
		args = ["mystery.js"];
	}
	var filePath = args[0];

	constraints(filePath);

	generateTestCases()

}

var engine = Random.engines.mt19937().autoSeed();

function createConcreteIntegerValue( greaterThan, constraintValue )
{
	if( greaterThan )
		return Random.integer(constraintValue,constraintValue+10)(engine);
	else
		return Random.integer(constraintValue-10,constraintValue)(engine);
}

function Constraint(properties)
{
	this.ident = properties.ident;
	this.expression = properties.expression;
	this.operator = properties.operator;
	this.value = properties.value;
	this.funcName = properties.funcName;
	// Supported kinds: "fileWithContent","fileExists"
	// integer, string, phoneNumber
	this.kind = properties.kind;
	//this.alt = properties.alt;
}

function fakeDemo()
{
	console.log( faker.phone.phoneNumber() );
	console.log( faker.phone.phoneNumberFormat() );
	console.log( faker.phone.phoneFormats() );
}

var functionConstraints =
{
}

var mockFileLibrary = 
{
	pathExists:
	{
		'path/filePresent': {"Sharat.txt":"DevOps_Hw2"},
		'path/fileExists': {}
	},
	fileWithContent:
	{
		pathContent: 
		{	
  			file1: 'text content',
  			file_devops: ''
		}
	}
	/*dirWithContent:
	{
		pathContent:
		{
			file2: 'text content',
		}
	}*/
};

function generateTestCases()
{

	var content = "var mystery = require('./mystery.js')\nvar mock = require('mock-fs');\n";
	for ( var funcName in functionConstraints )
	{
		var params = {};
		
		// initialize params
		for (var i =0; i < functionConstraints[funcName].params.length; i++ )
		{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName] = [];

		}
		var options = _.contains(functionConstraints[funcName].params, 'options');
		var phoneNumber = _.contains(functionConstraints[funcName].params, 'phoneNumber');
		// update parameter values based on known constraints.
		var constraints = functionConstraints[funcName].constraints;
		// Handle global constraints...
		var fileWithContent = _.some(constraints, {kind: 'fileWithContent' });
		var pathExists      = _.some(constraints, {kind: 'fileExists' });
		var dirWithContent =  _.some(constraints, {kind: 'dirWithContent' });
		// plug-in values for parameters
		for( var c = 0; c < constraints.length; c++ )
		{
			var constraint = constraints[c];
			if( params.hasOwnProperty( constraint.ident ) )
			{
				params[constraint.ident].push(constraint.value);
				//params[constraint.ident] = [constraint.value,constraint.alt];	
			}
		}
		format_list = ['\'' + faker.phone.phoneNumber()+'\'','\'' + faker.phone.phoneNumber()+'\'','\''+1+'\''];
		console.log( params );
		// Prepare function arguments.
		list_params = [];
		result = [];
		if(phoneNumber)
		{
			for (var i =0; i < functionConstraints[funcName].params.length; i++ )
			{
			var paramName = functionConstraints[funcName].params[i];
			var phno = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName].push(phno);
			}
		}
		if(options)
		{
			for (var i =0; i < functionConstraints[funcName].params.length; i++ )
			{
			var paramName = functionConstraints[funcName].params[i];
			//params[paramName] = '\'' + faker.phone.phoneNumber()+'\'';
			params[paramName].push(format_list[i]);
			}
		}	

		var arg = Object.keys(params).map( function(k) {
			return list_params.push(params[k]); }).join(",");
		//console.log(list_params);
		//Generate all possible input combinations
		for ( var i=0; i < list_params[0].length; i++)
	  	{
	  		var temp = [];
	  		var accept_list = Combinations(list_params[0][i],temp.slice(), 1,list_params[1]);
	  		for (var k =0; k < accept_list.length; k++){
            	result.push(accept_list[k]);
            //console.log("pushing in output "+list2[j]);
	  		}
	  	}	
	  	//console.log(result);	
		
		for(var i =0;i < result.length;i++) {
		//var args = Object.keys(params).map( function(k) {return params[k][i]; }).join(",");
		var args = result[i].toString();
		console.log(args);
		if( pathExists || fileWithContent )
		{
			content += generateMockFsTestCases(pathExists,fileWithContent,funcName, args);
			// Bonus...generate constraint variations test cases....
			//content += generateMockFsTestCases(!pathExists,fileWithContent,funcName, args);
			//content += generateMockFsTestCases(pathExists,!fileWithContent,funcName, args);
			//content += generateMockFsTestCases(!pathExists,!fileWithContent,funcName, args);
		}
		else
		{
			// Emit simple test case.

			content += "mystery.{0}({1});\n".format(funcName, args );

		}
			}
	}


	fs.writeFileSync('test.js', content, "utf8");

}

function Combinations(currentElement,newList,listNumber,nextList)
{
	var tests =[];
	newList.push(currentElement);
	var next = listNumber+1;
	if(nextList == null)
	{
		tests.push(newList);
		return tests;
	}

	for(var i =0; i<nextList.length; i++)
	{
		var arr = Combinations(nextList[i],newList.slice(),next,list_params[next] )
		for(var j=0; j < arr.length; j++)
		{
	         tests.push(arr[j]);
		}
	}
	return tests;
}

function generateMockFsTestCases (pathExists,fileWithContent,funcName,args) 
{
	var testCase = "";
	// Build mock file system based on constraints.
	var mergedFS = {};
	if( pathExists )
	{
		for (var attrname in mockFileLibrary.pathExists) { mergedFS[attrname] = mockFileLibrary.pathExists[attrname]; }
	}
	if( fileWithContent )
	{
		for (var attrname in mockFileLibrary.fileWithContent) { mergedFS[attrname] = mockFileLibrary.fileWithContent[attrname]; }
	}

	testCase += 
	"mock(" +
		JSON.stringify(mergedFS)
		+
	");\n";

	testCase += "\tmystery.{0}({1});\n".format(funcName, args );
	testCase+="mock.restore();\n";
	return testCase;
}

function constraints(filePath)
{
   var buf = fs.readFileSync(filePath, "utf8");
	var result = esprima.parse(buf, options);

	traverse(result, function (node) 
	{
		if (node.type === 'FunctionDeclaration') 
		{
			var funcName = functionName(node);
			console.log("Line : {0} Function: {1}".format(node.loc.start.line, funcName ));

			var params = node.params.map(function(p) {return p.name});
			functionConstraints[funcName] = {constraints:[], params: params};

			// Check for expressions using argument.
			traverse(node, function(child)
			{
				if( child.type === 'BinaryExpression' && child.operator == "==")
				{
					if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
					{
						// get expression from original source code:
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						functionConstraints[funcName].constraints.push( 
									new Constraint(
									{
										ident: child.left.name,
										value: rightHand,
										funcName: funcName,
										kind: "integer",
										operator : child.operator,
										expression: expression
									}));
						functionConstraints[funcName].constraints.push( 
									new Constraint(
									{
										ident: child.left.name,
										value: "'random-text'",
										funcName: funcName,
										kind: "integer",
										operator : child.operator,
										expression: expression
									}));
												
					}
					
					else if(child.left.type == 'Identifier' && child.left.name == "area")
					{	
						var expression = buf.substring(child.range[0], child.range[1]);
						var rightHand = buf.substring(child.right.range[0], child.right.range[1])
						var val = "'" + "(" + String(child.right.value) + ")" + "984-1235" + "'";
						var alt = "'" + "(" + (parseInt(child.right.value)-10)+"" + ")" + "984-1235" + "'";						
						functionConstraints[funcName].constraints.push( 
						new Constraint(
						{
							ident: params[0],
							value:  val,
							funcName: funcName,
							kind: "phoneNumber",
							operator : child.operator,
							expression: expression
						}));
						functionConstraints[funcName].constraints.push( 
						new Constraint(
						{
							ident: params[0],
							value:  alt,
							funcName: funcName,
							kind: "phoneNumber",
							operator : child.operator,
							expression: expression
						}));								
					}	
						
				}
				
				/*if( child.type === 'LogicalExpression' && child.right.type == "UnaryExpression")
                                {
                                	if(child.right.operator == "!")
                                        {
                                                // get expression from original source code:
                                                var expression = buf.substring(child.range[0], child.range[1]);
                                                
												functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: child.right.argument.object.name,
                                                                value: 1,
     															funcName: funcName,
                                                                kind: "string",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                
                                        }        
                                 
                                }*/
                                        
				if( child.type === 'BinaryExpression' && child.operator == "!=")
                                {
                                        if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
                                        {
                                                // get expression from original source code:
                                                var expression = buf.substring(child.range[0], child.range[1]);
                                                var rightHand = buf.substring(child.right.range[0], child.right.range[1])
												functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: child.left.name,
                                                                value: rightHand,
																funcName: funcName,
                                                                kind: "string",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                
                                                
                                        }
                                        else if(child.left.type == 'Identifier' && child.left.name == "area")
										{	
												var expression = buf.substring(child.range[0], child.range[1]);
												var rightHand = buf.substring(child.right.range[0], child.right.range[1])
												var val = "'" + "(" + String(child.right.value) + ")" + "984-1235" + "'";
												var alt = "'" + "(" + (parseInt(child.right.value)-10)+"" + ")" + "984-1235" + "'";						
												functionConstraints[funcName].constraints.push( 
												new Constraint(
												{
													ident: params[0],
													value:  val,
													funcName: funcName,
													kind: "phoneNumber",
													operator : child.operator,
													expression: expression
												}));
												functionConstraints[funcName].constraints.push( 
												new Constraint(
												{
													ident: params[0],
													value:  alt,
													funcName: funcName,
													kind: "phoneNumber",
													operator : child.operator,
													expression: expression
												}));								
										}	
                                        
                                }
				
				if( child.type === 'BinaryExpression' && child.operator == "<")
                                {
                                        if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
                                        {
                                                // get expression from original source code:
                                                var expression = buf.substring(child.range[0], child.range[1]);
                                                var rightHand = buf.substring(child.right.range[0], child.right.range[1])
												var val = (parseInt(rightHand)-1)+"";
												var alt = (parseInt(rightHand)+1)+"";
                                                functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: child.left.name,
                                                                value: val,
																funcName: funcName,
                                                                kind: "integer",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: child.left.name,
                                                                value: alt,
																funcName: funcName,
                                                                kind: "integer",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                
                                        }
                                }

                if( child.type === 'BinaryExpression' && child.operator == ">")
                                {
                                        if( child.left.type == 'Identifier' && params.indexOf( child.left.name ) > -1)
                                        {
                                                // get expression from original source code:
                                                var expression = buf.substring(child.range[0], child.range[1]);
                                                var rightHand = buf.substring(child.right.range[0], child.right.range[1])
												var val = (parseInt(rightHand)+1)+"";
												var alt = (parseInt(rightHand)-1)+"";
                                                functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: child.left.name,
                                                                value: val,
																funcName: funcName,
                                                                kind: "integer",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: child.left.name,
                                                                value: alt,
																funcName: funcName,
                                                                kind: "integer",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                        }
                                }

				if(child.type == 'CallExpression' && child.callee.property && child.callee.property.name == "indexOf")
					{
						var val = "'" + String(child.arguments[0].value)+ "'";
												
						functionConstraints[funcName].constraints.push( 
						new Constraint(
						{
							ident: child.callee.object.name,
							value:  val,
							funcName: funcName,
							kind: "string",
							operator : child.operator,
							expression: expression
						}));				
					
					}                                  

                if( child.type == "CallExpression" && 
					 child.callee.property &&
					 child.callee.property.name =="readFileSync" )
				{
					for( var p =0; p < params.length; p++ )
					{
						if( child.arguments[0].name == params[p] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file1'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file_devops'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								value:  "'pathContent/file_dev'",
								funcName: funcName,
								kind: "fileWithContent",
								operator : child.operator,
								expression: expression
							}));
						}
					}
				}
				//new
				if( child.type == "CallExpression" &&
                                         child.callee.property &&
                                         child.callee.property.name =="readdirSync" )
                                {
                                        for( var p =0; p < params.length; p++ )
                                        {
                                        	
                                                if( child.arguments[0].name == params[p] )
                                                {
                                                        
                                                        functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: params[p],
                                                                value:  "'path/filePresent'",
                                                                funcName: funcName,
                                                                kind: "fileWithContent",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                        functionConstraints[funcName].constraints.push(
                                                        new Constraint(
                                                        {
                                                                ident: params[p],
                                                                value:  "'path/fileExists'",
                                                                funcName: funcName,
                                                                kind: "fileWithContent",
                                                                operator : child.operator,
                                                                expression: expression
                                                        }));
                                                        functionConstraints[funcName].constraints.push(
														new Constraint(
														{
															ident: params[p],
															// A fake path to a file
															value:  "'path/dirExists'",
															funcName: funcName,
															kind: "fileExists",
															operator : child.operator,
															expression: expression
														}));
                                                }
                                        }
                                }


				if( child.type == "CallExpression" &&
					 child.callee.property &&
					 child.callee.property.name =="existsSync")
				{
					
						if( child.arguments[0].name == params[0] )
						{
							functionConstraints[funcName].constraints.push( 
							new Constraint(
							{
								ident: params[p],
								// A fake path to a file
								value:  "'path/fileExists'",
								funcName: funcName,
								kind: "fileExists",
								operator : child.operator,
								expression: expression
							}));
							
						}
					
				}

			});

			//console.log( functionConstraints[funcName]);

		}
	});
}

function traverse(object, visitor) 
{
    var key, child;

    visitor.call(null, object);
    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null) {
                traverse(child, visitor);
            }
        }
    }
}

function traverseWithCancel(object, visitor)
{
    var key, child;

    if( visitor.call(null, object) )
    {
	    for (key in object) {
	        if (object.hasOwnProperty(key)) {
	            child = object[key];
	            if (typeof child === 'object' && child !== null) {
	                traverseWithCancel(child, visitor);
	            }
	        }
	    }
 	 }
}

function functionName( node )
{
	if( node.id )
	{
		return node.id.name;
	}
	return "";
}


if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

main();
