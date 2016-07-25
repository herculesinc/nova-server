declare module "proxy-addr" {
	
	module proxyaddr {
        export function compile(val: any);
    }

	function proxyaddr (req: any, trust?: any);

	export = proxyaddr ;
}