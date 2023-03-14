# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  config.vm.box = "ubuntu/jammy64"
  # config.disksize.size = '30GB'
  if Vagrant.has_plugin?("vagrant-vbguest")
    config.vbguest.auto_update = false
  end

  config.vm.network "forwarded_port", guest: 8000, host: 8000
  config.vm.network "forwarded_port", guest: 80, host: 8080
  config.vm.network "forwarded_port", guest: 5432, host: 65432

  config.ssh.insert_key = true
  config.ssh.forward_agent = true

  config.vm.synced_folder "./", "/usr/local/apps/landmapper"

  config.vm.provider "virtualbox" do |vb|
    #vb.memory = "8192" # 8GB
    vb.memory = "4096" # 4GB
    # vb.memory = "3072"
  end

end
