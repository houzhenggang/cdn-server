function FindProxyForURL(url, host) {
 
    if (dnsDomainIs(host, "dot.dwstatic.com")){
        return 'PROXY 127.0.0.1:3456';
    }
    return 'DIRECT';
 
}