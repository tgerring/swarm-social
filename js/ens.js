let networkName = {
    '1': 'mainnet',
    '3': 'ropsten',
    '4': 'rinkeby'
};
let currentNetworkTitle = null;
let ens = null;

$(document).ready(function () {
    initEns();
});

function initEns() {
    console.log(web3);
    if (typeof web3 !== 'undefined') {
        window.web3 = new Web3(web3.currentProvider);
        console.log('current provider');
        console.log(web3.currentProvider);
    } else {
        window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }

    ens = new EthereumENS(window.web3.currentProvider);
    web3.version.getNetwork(function (error, result) {
        if (error) {
            console.error(error);

            return;
        }

        var networkId = result;
        console.log('Network id: ' + networkId);
        currentNetworkTitle = networkName[networkId];

        web3.eth.getAccounts(function (error, result) {
            if (error) {
                console.error(error);
            }

            console.log(result);
            if (result.length === 0) {
                alert('Please, select main Ethereum account, unlock MetaMask and reload this page.');
            } else {
                web3.eth.defaultAccount = result[0];
            }
        });

    });

    $('.update-ens').click(function (e) {
        e.preventDefault();
        $('#currentHash').val(swarm.applicationHash);
        $('#updateEnsModal').modal('show');
    });

    $('.send-ens-transaction').click(function (e) {
        e.preventDefault();
        saveDomainHash();
    });
}

function isCorrectDomain(domain) {
    var minDomainLength = 3;

    return domain && domain.length >= minDomainLength;
}

function isCorrectSwarmHash(hash) {
    var hashLength = 64;

    return hash && hash.length === hashLength;
}

function saveDomainHash() {
    let ensDomain = $('#ensDomain').val();
    let swarmHash = $('#currentHash').val();
    console.log([ensDomain, swarmHash]);

    if (!isCorrectDomain(ensDomain) || !isCorrectSwarmHash(swarmHash)) {
        alert('Incorrect domain or hash');

        return;
    }

    var resultSwarmHash = '0x' + swarmHash;
    var resolver = ens.resolver(ensDomain);
    resolver.instancePromise.then(function () {
        return resolver.setContent(resultSwarmHash, {from: web3.eth.defaultAccount}).then(function (result) {
            $('#updateEnsModal').modal('hide');
            // user complete transaction
            var subdomain = '';
            if (currentNetworkTitle && currentNetworkTitle !== 'mainnet') {
                subdomain = currentNetworkTitle + '.';
            }

            var shortResult = result.substring(0, 50) + '...';
            alert('Transaction complete. View transaction on Etherscan: <a href="https://' + subdomain + 'etherscan.io/tx/' + result + '" target="_blank">' + shortResult + '</a>');
        }).catch(function (r) {
            alert('Transaction rejected');
        });
    }).catch(function (e) {
        alert('Domain name not found, resolver not set or it does not belong to you');
    });
}

function alert(message) {
    $('#messageBody').html(message);
    $('#messageModal').modal('show');
}